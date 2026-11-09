/**
 * Dhamrai Life — Lightweight Autonomous Road Traffic AI
 * ======================================================
 * Manages 2–4 ambient rickshaws/cycles traversing directed_nav_graph.json road edges.
 * Implements forward obstacle detection (stops within 4m of player/vehicles),
 * anti-deadlock respawning (>6s halted), distance-based chunk recycling,
 * and zero-garbage object pooling.
 */

import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { TrafficVehicleAgent, WorldPosition } from '@dhamrai/shared-contracts';
import { PhysicsWorld } from './PhysicsWorld.js';

export interface NavGraphNode {
  id: string;
  osmNodeId?: number;
  position: WorldPosition;
  isJunction: boolean;
  connectedEdgeIds: string[];
}

export interface NavGraphEdge {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  distanceMeters: number;
  allowsRickshaw: boolean;
  waypoints: WorldPosition[];
}

export interface DirectedNavGraph {
  version?: string;
  crs?: string;
  origin?: WorldPosition;
  nodes: Record<string, NavGraphNode>;
  edges: NavGraphEdge[];
}

export interface TrafficAgentInstance {
  agent: TrafficVehicleAgent;
  mesh: THREE.Group;
  collider: RAPIER.Collider | null;
  body: RAPIER.RigidBody | null;
  haltTimer: number; // Seconds spent continuously halted
  edgeIndex: number;
}

export class TrafficManager {
  private readonly scene: THREE.Scene;
  private readonly physics: PhysicsWorld;
  private nodesMap: Map<string, NavGraphNode> = new Map();
  private edgesMap: Map<string, NavGraphEdge> = new Map();
  private eligibleEdges: NavGraphEdge[] = [];

  public agents: TrafficAgentInstance[] = [];
  public readonly poolSize = 3; // Fixed pool of 3 ambient traffic vehicles

  // Scratch vectors to eliminate GC in the 60 Hz simulation loop
  private readonly _vTemp = new THREE.Vector3();
  private readonly _vForward = new THREE.Vector3();
  private readonly _quat = new THREE.Quaternion();

  constructor(scene: THREE.Scene, physics: PhysicsWorld) {
    this.scene = scene;
    this.physics = physics;
  }

  /**
   * Initializes navigation graph and spawns the ambient traffic pool.
   * If customGraph is provided (e.g. in tests), uses it; otherwise fetches from /world/directed_nav_graph.json.
   */
  public async init(customGraph?: DirectedNavGraph): Promise<void> {
    if (customGraph) {
      this.setNavGraph(customGraph);
    } else {
      await this.loadNavGraphFromUrl('/world/directed_nav_graph.json');
    }

    if (this.eligibleEdges.length === 0) {
      console.warn('TrafficManager: No rickshaw-eligible edges found in nav graph');
      return;
    }

    this.initAgentPool();
  }

  public setNavGraph(graph: DirectedNavGraph): void {
    this.nodesMap.clear();
    this.edgesMap.clear();
    this.eligibleEdges = [];

    // Index nodes
    if (graph.nodes) {
      for (const [id, node] of Object.entries(graph.nodes)) {
        this.nodesMap.set(id, node);
      }
    }

    // Index edges
    const edgeList: NavGraphEdge[] = Array.isArray(graph.edges)
      ? graph.edges
      : (Object.values(graph.edges) as NavGraphEdge[]);
    for (const edge of edgeList) {
      this.edgesMap.set(edge.id, edge);
      if (edge.allowsRickshaw && edge.waypoints && edge.waypoints.length >= 2) {
        this.eligibleEdges.push(edge);
      }
    }
  }

  private async loadNavGraphFromUrl(url: string): Promise<void> {
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        const data: DirectedNavGraph = await resp.json();
        this.setNavGraph(data);
      } else {
        console.warn(`TrafficManager: HTTP ${resp.status} fetching ${url}`);
      }
    } catch (err) {
      console.warn('TrafficManager: Error loading nav graph:', err);
    }
  }

  /**
   * Instantiates pooled traffic agents.
   */
  private initAgentPool(): void {
    const defaultCenter: WorldPosition = { x: 0, y: 0, z: 0 };
    for (let i = 0; i < this.poolSize; i++) {
      const id = `traffic_rickshaw_${i + 1}`;
      const edge = this.findSpawnEdge(defaultCenter, i * 20);
      if (!edge) continue;

      const mesh = this.createTrafficRickshawMesh(i);
      this.scene.add(mesh);

      // Create Rapier kinematic body & cuboid collider
      let body: RAPIER.RigidBody | null = null;
      let collider: RAPIER.Collider | null = null;

      if (this.physics.ready) {
        const { world, rapier } = this.physics;
        const bodyDesc = rapier.RigidBodyDesc.kinematicPositionBased().setTranslation(
          edge.waypoints[0]!.x,
          edge.waypoints[0]!.y + 0.6,
          edge.waypoints[0]!.z
        );
        body = world.createRigidBody(bodyDesc);
        // Rickshaw bounding box: 0.8m width, 1.0m height, 1.8m length
        const colDesc = rapier.ColliderDesc.cuboid(0.4, 0.5, 0.9);
        collider = world.createCollider(colDesc, body);
      }

      // Speeds: 8–12 km/h (2.22 to 3.33 m/s)
      const speedMps = 2.4 + (i * 0.35); // 8.6 to 11.2 km/h

      const initialPos = { ...edge.waypoints[0]! };
      const nextPos = edge.waypoints[1]!;
      const initialHeading = Math.atan2(nextPos.x - initialPos.x, nextPos.z - initialPos.z);

      mesh.position.set(initialPos.x, initialPos.y, initialPos.z);
      mesh.rotation.y = initialHeading;

      const agent: TrafficVehicleAgent = {
        id,
        currentEdgeId: edge.id,
        edgeProgressPercent: 0.05 + (i * 0.25),
        speedMps,
        position: initialPos,
        headingRadians: initialHeading,
        isHalted: false,
      };

      this.agents.push({
        agent,
        mesh,
        collider,
        body,
        haltTimer: 0,
        edgeIndex: i,
      });
    }
  }

  /**
   * Finds an eligible road edge within range of a target position.
   */
  public findSpawnEdge(center: WorldPosition, offsetSeed = 0): NavGraphEdge | null {
    if (this.eligibleEdges.length === 0) return null;

    // Filter edges within 30m to 100m of center
    const nearby = this.eligibleEdges.filter((e) => {
      const p = e.waypoints[0]!;
      const d = Math.hypot(p.x - center.x, p.z - center.z);
      return d >= 25 && d <= 120;
    });

    if (nearby.length > 0) {
      const idx = Math.abs(offsetSeed) % nearby.length;
      return nearby[idx]!;
    }

    // Fallback: pick any eligible edge
    return this.eligibleEdges[offsetSeed % this.eligibleEdges.length]!;
  }

  /**
   * Main simulation step called at 60 Hz.
   * @param dt Delta time in seconds.
   * @param playerPos Current player position.
   * @param playerRickshawPos Optional player rickshaw position.
   */
  public update(dt: number, playerPos: WorldPosition, playerRickshawPos?: WorldPosition): void {
    if (this.agents.length === 0) return;

    for (let i = 0; i < this.agents.length; i++) {
      const inst = this.agents[i]!;
      const agent = inst.agent;
      const edge = this.edgesMap.get(agent.currentEdgeId);

      if (!edge || !edge.waypoints || edge.waypoints.length < 2) {
        this.respawnAgent(inst, playerPos, i * 31);
        continue;
      }

      // 1. Distance check to player (Despawn / Recycle when > 140m)
      const distToPlayer = Math.hypot(
        agent.position.x - playerPos.x,
        agent.position.z - playerPos.z
      );

      if (distToPlayer > 140) {
        this.respawnAgent(inst, playerPos, i * 47);
        continue;
      }

      // 2. Obstacle Detection within 4.0m forward cone
      const hasObstacle = this.checkObstacleAhead(inst, playerPos, playerRickshawPos);

      if (hasObstacle) {
        agent.isHalted = true;
        inst.haltTimer += dt;

        // Anti-deadlock: If halted for > 6 seconds, gracefully respawn elsewhere
        if (inst.haltTimer > 6.0) {
          this.respawnAgent(inst, playerPos, i * 59);
        }
        continue;
      }

      // Free to move
      agent.isHalted = false;
      inst.haltTimer = 0;

      // 3. Advance progress along current edge
      const edgeLength = edge.distanceMeters || this.calculateEdgeLength(edge.waypoints);
      const safeLength = Math.max(edgeLength, 2.0);
      const deltaProgress = (agent.speedMps * dt) / safeLength;
      agent.edgeProgressPercent += deltaProgress;

      // 4. Edge Transition when reaching 100%
      if (agent.edgeProgressPercent >= 1.0) {
        const nextEdge = this.selectNextConnectedEdge(edge);
        if (nextEdge) {
          agent.currentEdgeId = nextEdge.id;
          agent.edgeProgressPercent = 0.0;
        } else {
          // Dead end or no forward edges: respawn or cycle
          this.respawnAgent(inst, playerPos, i * 73);
          continue;
        }
      }

      // 5. Interpolate spatial position & heading
      const currentEdge = this.edgesMap.get(agent.currentEdgeId) || edge;
      const { pos, heading } = this.sampleEdgeSpline(currentEdge.waypoints, agent.edgeProgressPercent);

      agent.position = pos;
      agent.headingRadians = heading;

      // Update Three.js Mesh
      inst.mesh.position.set(pos.x, pos.y, pos.z);
      inst.mesh.rotation.y = heading;

      // Update Rapier Kinematic RigidBody
      if (inst.body) {
        inst.body.setNextKinematicTranslation({
          x: pos.x,
          y: pos.y + 0.6,
          z: pos.z,
        });

        this._quat.setFromAxisAngle(this._vTemp.set(0, 1, 0), heading);
        inst.body.setNextKinematicRotation({
          x: this._quat.x,
          y: this._quat.y,
          z: this._quat.z,
          w: this._quat.w,
        });
      }
    }
  }

  /**
   * Forward cone check: stops vehicle if player, player vehicle, or other traffic agent is within 4m.
   */
  public checkObstacleAhead(
    inst: TrafficAgentInstance,
    playerPos: WorldPosition,
    playerRickshawPos?: WorldPosition
  ): boolean {
    const agent = inst.agent;
    const stoppingDistanceM = 4.0;

    // Unit forward vector in Three.js coordinates (heading theta: sin(theta) along X, cos(theta) along Z)
    const sinH = Math.sin(agent.headingRadians);
    const cosH = Math.cos(agent.headingRadians);
    this._vForward.set(sinH, 0, cosH);

    // Helper to evaluate obstacle in forward cone
    const isInCone = (target: WorldPosition): boolean => {
      const dx = target.x - agent.position.x;
      const dz = target.z - agent.position.z;
      const dist = Math.hypot(dx, dz);

      if (dist < 0.2 || dist > stoppingDistanceM) return false;

      // Normalize direction vector
      const nx = dx / dist;
      const nz = dz / dist;

      // Dot product with forward vector
      const dot = nx * sinH + nz * cosH;
      // Dot > 0.5 corresponds to roughly a 60-degree cone in front
      return dot > 0.5;
    };

    // Check player
    if (isInCone(playerPos)) return true;

    // Check player rickshaw
    if (playerRickshawPos && isInCone(playerRickshawPos)) return true;

    // Check other traffic agents in pool
    for (const other of this.agents) {
      if (other.agent.id === agent.id) continue;
      if (isInCone(other.agent.position)) return true;
    }

    return false;
  }

  /**
   * Selects next connected edge from the destination node to continue journey.
   */
  private selectNextConnectedEdge(currentEdge: NavGraphEdge): NavGraphEdge | null {
    const toNode = this.nodesMap.get(currentEdge.toNodeId);
    if (!toNode || !toNode.connectedEdgeIds || toNode.connectedEdgeIds.length === 0) {
      return null;
    }

    // Filter candidate edges (avoid immediately reversing along the same edge if alternatives exist)
    const candidates = toNode.connectedEdgeIds
      .map((id) => this.edgesMap.get(id))
      .filter((e): e is NavGraphEdge => !!e && e.allowsRickshaw && e.id !== currentEdge.id);

    if (candidates.length > 0) {
      const randIdx = Math.floor(Math.random() * candidates.length);
      return candidates[randIdx]!;
    }

    // If only the reverse edge exists, take it
    const anyCandidate = toNode.connectedEdgeIds
      .map((id) => this.edgesMap.get(id))
      .find((e): e is NavGraphEdge => !!e && e.allowsRickshaw);

    return anyCandidate || null;
  }

  /**
   * Interpolates piecewise linear position and heading along waypoints.
   */
  public sampleEdgeSpline(
    waypoints: WorldPosition[],
    progress: number
  ): { pos: WorldPosition; heading: number } {
    const clampedProgress = Math.max(0.0, Math.min(1.0, progress));
    const n = waypoints.length;
    if (n === 0) return { pos: { x: 0, y: 0, z: 0 }, heading: 0 };
    if (n === 1) return { pos: { ...waypoints[0]! }, heading: 0 };

    // Calculate segment lengths
    const segLengths: number[] = [];
    let totalLength = 0;
    for (let i = 0; i < n - 1; i++) {
      const p1 = waypoints[i]!;
      const p2 = waypoints[i + 1]!;
      const len = Math.hypot(p2.x - p1.x, p2.z - p1.z);
      segLengths.push(len);
      totalLength += len;
    }

    if (totalLength <= 0.001) {
      return { pos: { ...waypoints[0]! }, heading: 0 };
    }

    const targetDist = clampedProgress * totalLength;
    let accumulated = 0;

    for (let i = 0; i < n - 1; i++) {
      const segLen = segLengths[i]!;
      if (accumulated + segLen >= targetDist || i === n - 2) {
        const segProgress = segLen > 0 ? (targetDist - accumulated) / segLen : 0;
        const p1 = waypoints[i]!;
        const p2 = waypoints[i + 1]!;

        const x = p1.x + (p2.x - p1.x) * segProgress;
        const y = p1.y + (p2.y - p1.y) * segProgress;
        const z = p1.z + (p2.z - p1.z) * segProgress;

        const heading = Math.atan2(p2.x - p1.x, p2.z - p1.z);
        return { pos: { x, y, z }, heading };
      }
      accumulated += segLen;
    }

    const last = waypoints[n - 1]!;
    const prev = waypoints[n - 2]!;
    const finalHeading = Math.atan2(last.x - prev.x, last.z - prev.z);
    return { pos: { ...last }, heading: finalHeading };
  }

  private calculateEdgeLength(waypoints: WorldPosition[]): number {
    let len = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      len += Math.hypot(
        waypoints[i + 1]!.x - waypoints[i]!.x,
        waypoints[i + 1]!.z - waypoints[i]!.z
      );
    }
    return len;
  }

  /**
   * Respawns an agent on a valid road edge 35m–90m away from the player.
   */
  public respawnAgent(inst: TrafficAgentInstance, playerPos: WorldPosition, seed: number): void {
    const edge = this.findSpawnEdge(playerPos, seed);
    if (!edge || !edge.waypoints || edge.waypoints.length < 2) return;

    const agent = inst.agent;
    agent.currentEdgeId = edge.id;
    agent.edgeProgressPercent = 0.0;
    agent.isHalted = false;
    inst.haltTimer = 0;

    const { pos, heading } = this.sampleEdgeSpline(edge.waypoints, 0.0);
    agent.position = pos;
    agent.headingRadians = heading;

    inst.mesh.position.set(pos.x, pos.y, pos.z);
    inst.mesh.rotation.y = heading;

    if (inst.body) {
      inst.body.setTranslation({ x: pos.x, y: pos.y + 0.6, z: pos.z }, true);
      this._quat.setFromAxisAngle(this._vTemp.set(0, 1, 0), heading);
      inst.body.setRotation(
        { x: this._quat.x, y: this._quat.y, z: this._quat.z, w: this._quat.w },
        true
      );
    }
  }

  /**
   * Constructs an authentic, lightweight ambient pedal rickshaw mesh with driver silhouette.
   */
  private createTrafficRickshawMesh(index: number): THREE.Group {
    const group = new THREE.Group();
    group.name = `TrafficRickshaw_${index}`;

    // Distinct canopy and chassis color themes for visual diversity
    const palette = [
      { chassis: 0x16a085, canopy: 0x27ae60 }, // Green / Teal
      { chassis: 0xd35400, canopy: 0xe67e22 }, // Saffron / Orange
      { chassis: 0x2980b9, canopy: 0x8e44ad }, // Blue / Purple
    ];
    const theme = palette[index % palette.length]!;

    const chassisMat = new THREE.MeshStandardMaterial({ color: theme.chassis, roughness: 0.7 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: theme.canopy, roughness: 0.6 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.9 });
    const metalMat = new THREE.MeshStandardMaterial({ color: 0xbdc3c7, metalness: 0.8, roughness: 0.3 });
    const driverMat = new THREE.MeshStandardMaterial({ color: 0x34495e, roughness: 0.8 });

    // Chassis base
    const baseGeom = new THREE.BoxGeometry(0.75, 0.12, 1.6);
    const baseMesh = new THREE.Mesh(baseGeom, chassisMat);
    baseMesh.position.set(0, 0.45, 0);
    group.add(baseMesh);

    // Passenger Hood / Canopy
    const hoodGeom = new THREE.BoxGeometry(0.76, 0.65, 0.8);
    const hoodMesh = new THREE.Mesh(hoodGeom, canopyMat);
    hoodMesh.position.set(0, 0.95, 0.35);
    group.add(hoodMesh);

    // Wheels (Front: single; Rear: two)
    const wheelGeom = new THREE.CylinderGeometry(0.28, 0.28, 0.08, 12);
    wheelGeom.rotateZ(Math.PI / 2);

    // Front wheel
    const fw = new THREE.Mesh(wheelGeom, wheelMat);
    fw.position.set(0, 0.28, -0.7);
    group.add(fw);

    // Rear left & right wheels
    const rwl = new THREE.Mesh(wheelGeom, wheelMat);
    rwl.position.set(-0.4, 0.28, 0.45);
    group.add(rwl);

    const rwr = new THREE.Mesh(wheelGeom, wheelMat);
    rwr.position.set(0.4, 0.28, 0.45);
    group.add(rwr);

    // Handlebar frame
    const barGeom = new THREE.BoxGeometry(0.5, 0.04, 0.04);
    const barMesh = new THREE.Mesh(barGeom, metalMat);
    barMesh.position.set(0, 0.85, -0.5);
    group.add(barMesh);

    // Driver silhouette capsule
    const driverGeom = new THREE.CapsuleGeometry(0.18, 0.45, 6, 8);
    const driverMesh = new THREE.Mesh(driverGeom, driverMat);
    driverMesh.position.set(0, 0.88, -0.2);
    group.add(driverMesh);

    return group;
  }

  public getAgents(): TrafficVehicleAgent[] {
    return this.agents.map((a) => a.agent);
  }

  public dispose(): void {
    for (const inst of this.agents) {
      if (inst.collider && this.physics.ready) {
        this.physics.removeCollider(inst.collider);
      }
      if (inst.body && this.physics.ready) {
        this.physics.world.removeRigidBody(inst.body);
      }
      this.scene.remove(inst.mesh);
      inst.mesh.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
      });
    }
    this.agents = [];
    this.nodesMap.clear();
    this.edgesMap.clear();
    this.eligibleEdges = [];
  }
}
