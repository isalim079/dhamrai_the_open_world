import React, { useEffect, useRef, useState } from 'react';
import { useSessionStore } from '../state/useSessionStore.js';
import { useGameStore } from '../state/useGameStore.js';
import { PHASE_1_MISSIONS } from '@dhamrai/game-core';
import type { WorldPosition } from '@dhamrai/shared-contracts';

interface NavGraphData {
  edges:
    | Record<string, { waypoints: WorldPosition[]; allowsRickshaw: boolean }>
    | Array<{ waypoints: WorldPosition[]; allowsRickshaw: boolean }>;
}

export const Minimap: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playerPosition = useSessionStore((s) => s.playerPosition);
  const playerHeading = useSessionStore((s) => s.playerHeading);
  const currentMissionId = useGameStore((s) => s.currentActiveMissionId);
  const allMissions = useGameStore((s) => s.allMissions);

  const [navGraph, setNavGraph] = useState<NavGraphData | null>(null);

  // 1. Fetch nav graph once
  useEffect(() => {
    let active = true;
    fetch('/world/directed_nav_graph.json')
      .then((res) => res.json())
      .then((data: NavGraphData) => {
        if (active) setNavGraph(data);
      })
      .catch((err) => {
        console.warn('Minimap: Failed to load directed_nav_graph.json:', err);
      });
    return () => {
      active = false;
    };
  }, []);

  // 2. Render 2D radar each frame
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const radarRadiusM = 120.0;
    const scale = (width / 2) / radarRadiusM; // pixels per metre

    // Clear background
    ctx.clearRect(0, 0, width, height);

    // Circular clipping mask
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, width / 2 - 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(13, 17, 23, 0.92)';
    ctx.fill();
    ctx.clip();

    // Draw range rings (40m, 80m, 120m)
    ctx.strokeStyle = 'rgba(48, 54, 61, 0.4)';
    ctx.lineWidth = 1;
    for (const r of [40, 80, 120]) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, r * scale, 0, Math.PI * 2);
      ctx.stroke();
    }

    // World-to-radar transform helper (Three.js: +X is East, +Z is South)
    const toRadarX = (wx: number) => centerX + (wx - playerPosition.x) * scale;
    const toRadarY = (wz: number) => centerY + (wz - playerPosition.z) * scale;

    // Draw Roads from nav graph
    if (navGraph && navGraph.edges) {
      ctx.strokeStyle = 'rgba(139, 148, 158, 0.65)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const edgeList = Array.isArray(navGraph.edges)
        ? navGraph.edges
        : Object.values(navGraph.edges);

      for (const edge of edgeList) {
        const wp = edge.waypoints;
        if (!wp || wp.length < 2) continue;

        // Skip roads entirely outside radar box
        const start = wp[0]!;
        if (Math.hypot(start.x - playerPosition.x, start.z - playerPosition.z) > radarRadiusM * 1.5) {
          continue;
        }

        ctx.beginPath();
        ctx.moveTo(toRadarX(start.x), toRadarY(start.z));
        for (let i = 1; i < wp.length; i++) {
          ctx.lineTo(toRadarX(wp[i]!.x), toRadarY(wp[i]!.z));
        }
        ctx.stroke();
      }
    }

    // Draw Active Mission Destination Marker
    if (currentMissionId && PHASE_1_MISSIONS[currentMissionId]) {
      const def = PHASE_1_MISSIONS[currentMissionId];
      const inst = allMissions[currentMissionId];
      const uncompletedObj = def.objectives.find(
        (o) => !inst?.completedObjectiveIds.includes(o.id)
      );

      if (uncompletedObj) {
        const tx = uncompletedObj.targetPosition.x;
        const tz = uncompletedObj.targetPosition.z;
        const dist = Math.hypot(tx - playerPosition.x, tz - playerPosition.z);

        ctx.save();
        if (dist <= radarRadiusM) {
          // Inside radar view
          const rx = toRadarX(tx);
          const ry = toRadarY(tz);
          ctx.beginPath();
          ctx.arc(rx, ry, 6, 0, Math.PI * 2);
          ctx.fillStyle = '#f1c40f'; // Golden beacon
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          // Clamp to radar perimeter with directional arrow
          const angle = Math.atan2(tz - playerPosition.z, tx - playerPosition.x);
          const clampR = width / 2 - 12;
          const px = centerX + Math.cos(angle) * clampR;
          const py = centerY + Math.sin(angle) * clampR;

          ctx.beginPath();
          ctx.arc(px, py, 5, 0, Math.PI * 2);
          ctx.fillStyle = '#f1c40f';
          ctx.fill();
        }
        ctx.restore();
      }
    }

    // Draw Story NPCs
    // Farhana: (15, -10)
    ctx.beginPath();
    ctx.arc(toRadarX(15.0), toRadarY(-10.0), 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#58a6ff';
    ctx.fill();

    // Rafiq: (-61, 66.5)
    ctx.beginPath();
    ctx.arc(toRadarX(-61.0), toRadarY(66.5), 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#e3b341';
    ctx.fill();

    // Player Blip (Center of radar)
    ctx.save();
    ctx.translate(centerX, centerY);
    // Heading rotation: Three.js heading 0 is forward -Z (North, up on radar)
    ctx.rotate(playerHeading);

    // Direction cone
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(6, 6);
    ctx.lineTo(0, 3);
    ctx.lineTo(-6, 6);
    ctx.closePath();
    ctx.fillStyle = '#238636';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    ctx.restore(); // End circular clipping

    // Compass Ring Border
    ctx.beginPath();
    ctx.arc(centerX, centerY, width / 2 - 2, 0, Math.PI * 2);
    ctx.strokeStyle = '#58a6ff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // North Indicator 'N' at top
    ctx.fillStyle = '#58a6ff';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('N', centerX, 12);
  }, [playerPosition, playerHeading, currentMissionId, allMissions, navGraph]);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 24,
        left: 24,
        width: 160,
        height: 160,
        borderRadius: '50%',
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.7)',
        zIndex: 20,
        pointerEvents: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        width={160}
        height={160}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
};
