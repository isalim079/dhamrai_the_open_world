import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as THREE from 'three';
import { TrafficManager, DirectedNavGraph } from '../src/engine/TrafficManager.js';
import { PhysicsWorld } from '../src/engine/PhysicsWorld.js';

describe('TrafficManager — Autonomous Road Traffic AI', () => {
  let scene: THREE.Scene;
  let physics: PhysicsWorld;
  let trafficManager: TrafficManager;

  const mockNavGraph: DirectedNavGraph = {
    version: '1.0.0',
    nodes: {
      node_A: {
        id: 'node_A',
        position: { x: 30, y: 0, z: 0 },
        isJunction: true,
        connectedEdgeIds: ['edge_1', 'edge_3'],
      },
      node_B: {
        id: 'node_B',
        position: { x: 30, y: 0, z: 60 },
        isJunction: true,
        connectedEdgeIds: ['edge_1', 'edge_2'],
      },
      node_C: {
        id: 'node_C',
        position: { x: 90, y: 0, z: 60 },
        isJunction: false,
        connectedEdgeIds: ['edge_2'],
      },
      node_D: {
        id: 'node_D',
        position: { x: 30, y: 0, z: -60 },
        isJunction: false,
        connectedEdgeIds: ['edge_3'],
      },
    },
    edges: [
      {
        id: 'edge_1',
        fromNodeId: 'node_A',
        toNodeId: 'node_B',
        distanceMeters: 60,
        allowsRickshaw: true,
        waypoints: [
          { x: 30, y: 0, z: 0 },
          { x: 30, y: 0, z: 60 },
        ],
      },
      {
        id: 'edge_2',
        fromNodeId: 'node_B',
        toNodeId: 'node_C',
        distanceMeters: 60,
        allowsRickshaw: true,
        waypoints: [
          { x: 30, y: 0, z: 60 },
          { x: 90, y: 0, z: 60 },
        ],
      },
      {
        id: 'edge_3',
        fromNodeId: 'node_A',
        toNodeId: 'node_D',
        distanceMeters: 60,
        allowsRickshaw: true,
        waypoints: [
          { x: 30, y: 0, z: 0 },
          { x: 30, y: 0, z: -60 },
        ],
      },
    ],
  };

  beforeEach(async () => {
    scene = new THREE.Scene();
    physics = new PhysicsWorld();
    await physics.init();
    trafficManager = new TrafficManager(scene, physics);
    await trafficManager.init(mockNavGraph);
  });

  afterEach(() => {
    trafficManager.dispose();
    physics.dispose();
  });

  it('should initialize a pool of 3 ambient traffic vehicles on eligible road edges', () => {
    expect(trafficManager.agents.length).toBe(3);
    const agentData = trafficManager.getAgents();
    expect(agentData.length).toBe(3);

    for (const a of agentData) {
      expect(a.speedMps).toBeGreaterThanOrEqual(2.2); // >= 8 km/h
      expect(a.speedMps).toBeLessThanOrEqual(3.5); // <= 12.6 km/h
      expect(a.currentEdgeId).toBeDefined();
      expect(a.isHalted).toBe(false);
    }
  });

  it('should sample spline waypoints and calculate correct heading', () => {
    const waypoints = [
      { x: 0, y: 0, z: 0 },
      { x: 0, y: 0, z: 100 },
    ];

    const mid = trafficManager.sampleEdgeSpline(waypoints, 0.5);
    expect(mid.pos.x).toBeCloseTo(0);
    expect(mid.pos.z).toBeCloseTo(50);
    // Heading along +Z is atan2(0, 100) = 0
    expect(mid.heading).toBeCloseTo(0);

    const end = trafficManager.sampleEdgeSpline(waypoints, 1.0);
    expect(end.pos.z).toBeCloseTo(100);
  });

  it('should advance vehicle progress and position during unblocked update', () => {
    const agentInst = trafficManager.agents[0]!;
    agentInst.agent.currentEdgeId = 'edge_1';
    agentInst.agent.edgeProgressPercent = 0.1;
    agentInst.agent.position = { x: 30, y: 0, z: 6 };
    agentInst.agent.headingRadians = 0; // Heading along +Z

    // Far away player, no obstacle
    const playerPos = { x: -50, y: 0, z: -50 };
    trafficManager.update(1.0, playerPos);

    expect(agentInst.agent.isHalted).toBe(false);
    expect(agentInst.agent.edgeProgressPercent).toBeGreaterThan(0.1);
    expect(agentInst.agent.position.z).toBeGreaterThan(6);
  });

  it('should halt vehicle when obstacle (player) is within 4m forward cone', () => {
    const agentInst = trafficManager.agents[0]!;
    agentInst.agent.currentEdgeId = 'edge_1';
    agentInst.agent.edgeProgressPercent = 0.2;
    agentInst.agent.position = { x: 30, y: 0, z: 12 };
    agentInst.agent.headingRadians = 0; // heading +Z

    // Place player 2.5m ahead on the same line (+Z)
    const playerAhead = { x: 30, y: 0, z: 14.5 };
    trafficManager.update(0.1, playerAhead);

    expect(agentInst.agent.isHalted).toBe(true);
    // Position must not have advanced significantly
    expect(agentInst.agent.position.z).toBeCloseTo(12, 1);
  });

  it('should trigger anti-deadlock respawn after remaining halted for > 6 seconds', () => {
    const agentInst = trafficManager.agents[0]!;
    agentInst.agent.currentEdgeId = 'edge_1';
    agentInst.agent.position = { x: 30, y: 0, z: 12 };
    agentInst.agent.headingRadians = 0;

    const blockingPos = { x: 30, y: 0, z: 14 };

    // Simulate 7 seconds of blockage (70 steps of 0.1s)
    for (let step = 0; step < 70; step++) {
      trafficManager.update(0.1, blockingPos);
    }

    // After > 6s, anti-deadlock timer resets and respawns
    expect(agentInst.haltTimer).toBeLessThan(6.0);
  });

  it('should recycle agents that travel farther than 140m from the player', () => {
    const agentInst = trafficManager.agents[0]!;
    agentInst.agent.position = { x: 30, y: 0, z: 200 }; // 200m away

    const playerPos = { x: 0, y: 0, z: 0 };
    trafficManager.update(0.1, playerPos);

    // Agent must be respawned to a closer eligible edge (< 140m)
    const newDist = Math.hypot(
      agentInst.agent.position.x - playerPos.x,
      agentInst.agent.position.z - playerPos.z
    );
    expect(newDist).toBeLessThanOrEqual(140);
  });
});
