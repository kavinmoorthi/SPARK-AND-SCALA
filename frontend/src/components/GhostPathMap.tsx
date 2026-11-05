import React, { useEffect, useRef, useState } from 'react';
import { FusedTelemetry } from '../types/telemetry';
import { Navigation, Maximize2, Layers } from 'lucide-react';

interface GhostPathMapProps {
  currentTelemetry: FusedTelemetry | null;
  history: FusedTelemetry[];
}

export const GhostPathMap: React.FC<GhostPathMapProps> = ({ currentTelemetry, history }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState(3.5); // pixels per meter
  const [centerMode, setCenterMode] = useState<'auv' | 'lake'>('lake');
  const [showDr, setShowDr] = useState(true);
  const [showFixed, setShowFixed] = useState(true);
  const [showAdaptive, setShowAdaptive] = useState(true);
  const [showTruth, setShowTruth] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let pulseTime = 0;

    const render = () => {
      pulseTime += 0.04;
      const width = (canvas.width = canvas.parentElement?.clientWidth || 500);
      const height = (canvas.height = canvas.parentElement?.clientHeight || 400);

      // Background
      ctx.fillStyle = '#060B14';
      ctx.fillRect(0, 0, width, height);

      // Coordinate Transform: Lake (0,0) offset
      let originX = width * 0.25;
      let originY = height * 0.75;

      if (centerMode === 'auv' && currentTelemetry) {
        originX = width / 2 - currentTelemetry.adaptiveFilter.x * zoom;
        originY = height / 2 + currentTelemetry.adaptiveFilter.y * zoom;
      }

      const toScreenX = (lakeX: number) => originX + lakeX * zoom;
      const toScreenY = (lakeY: number) => originY - lakeY * zoom; // Y up in lake, down in screen

      // 1. Draw Sonar / Metric Grid
      ctx.strokeStyle = '#0E1D33';
      ctx.lineWidth = 1;
      const gridSize = 10; // 10 meters per grid block
      for (let x = -20; x <= 80; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(toScreenX(x), 0);
        ctx.lineTo(toScreenX(x), height);
        ctx.stroke();

        ctx.fillStyle = '#1e3a5f';
        ctx.font = '9px "JetBrains Mono"';
        ctx.fillText(`${x}m`, toScreenX(x) + 3, height - 8);
      }

      for (let y = -20; y <= 80; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, toScreenY(y));
        ctx.lineTo(width, toScreenY(y));
        ctx.stroke();

        ctx.fillStyle = '#1e3a5f';
        ctx.font = '9px "JetBrains Mono"';
        ctx.fillText(`${y}m`, 8, toScreenY(y) - 3);
      }

      // 2. Draw Home Beacon Dock at (0, 0)
      const dockScreenX = toScreenX(0);
      const dockScreenY = toScreenY(0);

      // Radiating sonar rings from beacon
      const beaconPulse = (Math.sin(pulseTime) + 1) * 0.5;
      ctx.save();
      ctx.strokeStyle = `rgba(0, 242, 254, ${0.4 - beaconPulse * 0.3})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(dockScreenX, dockScreenY, 15 + beaconPulse * 25, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#00F2FE';
      ctx.beginPath();
      ctx.arc(dockScreenX, dockScreenY, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '10px "JetBrains Mono"';
      ctx.fillStyle = '#00F2FE';
      ctx.fillText('HOME BEACON (0,0)', dockScreenX + 8, dockScreenY - 6);
      ctx.restore();

      // 3. Draw Path Trails
      const drawTrail = (
        pts: { x: number; y: number }[],
        color: string,
        lineWidth: number,
        dash: number[] = [],
        glow = false
      ) => {
        if (pts.length < 2) return;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.setLineDash(dash);
        if (glow) {
          ctx.shadowColor = color;
          ctx.shadowBlur = 8;
        }

        ctx.beginPath();
        ctx.moveTo(toScreenX(pts[0].x), toScreenY(pts[0].y));
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(toScreenX(pts[i].x), toScreenY(pts[i].y));
        }
        ctx.stroke();
        ctx.restore();
      };

      if (history.length > 1) {
        // Ground Truth (White dashed)
        if (showTruth) {
          const truthPts = history.map((h) => ({ x: h.groundTruth.x, y: h.groundTruth.y }));
          drawTrail(truthPts, 'rgba(255, 255, 255, 0.65)', 1.5, [5, 4]);
        }

        // Dead Reckoning (Red solid, drifting)
        if (showDr) {
          const drPts = history.map((h) => ({ x: h.deadReckoning.x, y: h.deadReckoning.y }));
          drawTrail(drPts, '#FF4757', 1.8);
        }

        // Fixed Filter (Orange solid, wobbling)
        if (showFixed) {
          const fixedPts = history.map((h) => ({ x: h.fixedFilter.x, y: h.fixedFilter.y }));
          drawTrail(fixedPts, '#FF9F1C', 2.0);
        }

        // Adaptive Fused Path (Bioluminescent Cyan Glowing)
        if (showAdaptive) {
          const adaptPts = history.map((h) => ({ x: h.adaptiveFilter.x, y: h.adaptiveFilter.y }));
          drawTrail(adaptPts, '#00F2FE', 2.5, [], true);
        }
      }

      // 4. Draw Current AUV & Drift Error Halo
      if (currentTelemetry) {
        const auvX = toScreenX(currentTelemetry.adaptiveFilter.x);
        const auvY = toScreenY(currentTelemetry.adaptiveFilter.y);
        const headingDeg = currentTelemetry.adaptiveFilter.yaw;
        const headingRad = ((90 - headingDeg) * Math.PI) / 180.0; // Math angle

        // Live Drift Error Halo (expands with uncertaintyTrace)
        const haloRadius = Math.max(12, currentTelemetry.driftHaloRadius * zoom * 2.5);
        const haloPulse = Math.sin(pulseTime * 2) * 2;

        ctx.save();
        const haloGrad = ctx.createRadialGradient(auvX, auvY, 4, auvX, auvY, haloRadius + haloPulse);
        const haloCol =
          currentTelemetry.raw.ntu >= 100
            ? 'rgba(255, 71, 87,'
            : currentTelemetry.raw.ntu >= 20
            ? 'rgba(255, 159, 28,'
            : 'rgba(0, 242, 254,';

        haloGrad.addColorStop(0, `${haloCol} 0.4)`);
        haloGrad.addColorStop(0.7, `${haloCol} 0.15)`);
        haloGrad.addColorStop(1, `${haloCol} 0.0)`);

        ctx.fillStyle = haloGrad;
        ctx.beginPath();
        ctx.arc(auvX, auvY, haloRadius + haloPulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = `${haloCol} 0.7)`;
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.arc(auvX, auvY, haloRadius + haloPulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // AUV Marker Icon
        ctx.save();
        ctx.translate(auvX, auvY);
        ctx.rotate(-headingRad + Math.PI / 2);

        // Heading arrow
        ctx.fillStyle = '#00F2FE';
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(0, -10);
        ctx.lineTo(6, 8);
        ctx.lineTo(0, 4);
        ctx.lineTo(-6, 8);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        // Position label
        ctx.font = '10px "JetBrains Mono"';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(
          `AUV (${currentTelemetry.adaptiveFilter.x.toFixed(1)}, ${currentTelemetry.adaptiveFilter.y.toFixed(1)})`,
          auvX + 12,
          auvY + 4
        );
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [currentTelemetry, history, zoom, centerMode, showDr, showFixed, showAdaptive, showTruth]);

  return (
    <div className="relative w-full h-full min-h-[340px] rounded-2xl bg-abyss-900/70 border border-slate-800/80 backdrop-blur-md overflow-hidden flex flex-col shadow-2xl">
      {/* Map Header */}
      <div className="absolute top-3 left-4 z-10 flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-abyss-950/85 border border-biolum-cyan/30 backdrop-blur-md text-xs font-mono text-slate-200">
          <Navigation className="w-3.5 h-3.5 text-biolum-cyan" />
          <span>GHOST PATH & DRIFT HALO</span>
        </div>

        {/* Halo size readout */}
        {currentTelemetry && (
          <div className="px-2.5 py-1 rounded bg-abyss-950/80 border border-slate-800 text-[11px] font-mono text-slate-400">
            HALO UNCERTAINTY: <b className="text-biolum-cyan">{currentTelemetry.driftHaloRadius.toFixed(2)}m</b>
          </div>
        )}
      </div>

      {/* Map View Controls */}
      <div className="absolute top-3 right-4 z-10 flex items-center gap-1.5 bg-abyss-950/85 border border-slate-800 p-1 rounded-lg backdrop-blur-md">
        <button
          onClick={() => setZoom((z) => Math.min(8, z + 0.5))}
          className="px-2 py-0.5 rounded text-xs font-mono text-slate-300 hover:text-biolum-cyan hover:bg-slate-800"
        >
          +
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(1.5, z - 0.5))}
          className="px-2 py-0.5 rounded text-xs font-mono text-slate-300 hover:text-biolum-cyan hover:bg-slate-800"
        >
          -
        </button>
        <button
          onClick={() => setCenterMode((m) => (m === 'lake' ? 'auv' : 'lake'))}
          className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
            centerMode === 'auv' ? 'bg-biolum-cyan text-abyss-950 font-bold' : 'text-slate-400 hover:text-white'
          }`}
        >
          {centerMode === 'auv' ? 'TRACK AUV' : 'LAKE GRID'}
        </button>
      </div>

      {/* Main Sonar Map Canvas */}
      <canvas ref={canvasRef} className="flex-1 w-full h-full cursor-crosshair" />

      {/* Interactive Legend Toggles */}
      <div className="absolute bottom-3 left-4 right-4 z-10 flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-abyss-950/85 border border-slate-800/80 backdrop-blur-md text-[11px] font-mono">
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showAdaptive}
              onChange={(e) => setShowAdaptive(e.target.checked)}
              className="accent-biolum-cyan"
            />
            <span className="w-2.5 h-1 bg-biolum-cyan rounded inline-block shadow-[0_0_6px_#00F2FE]" />
            <span className="text-biolum-cyan font-bold">Adaptive Fused</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showFixed}
              onChange={(e) => setShowFixed(e.target.checked)}
              className="accent-alert-amber"
            />
            <span className="w-2.5 h-1 bg-alert-amber rounded inline-block" />
            <span className="text-alert-amber">Fixed Filter</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showDr}
              onChange={(e) => setShowDr(e.target.checked)}
              className="accent-alert-crimson"
            />
            <span className="w-2.5 h-1 bg-alert-crimson rounded inline-block" />
            <span className="text-alert-crimson">Dead Reckon (Drift)</span>
          </label>

          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={showTruth}
              onChange={(e) => setShowTruth(e.target.checked)}
              className="accent-slate-300"
            />
            <span className="w-2.5 h-0.5 bg-slate-300 border-dashed inline-block" />
            <span className="text-slate-300">Ground Truth</span>
          </label>
        </div>

        <div className="text-[10px] text-slate-500 font-mono">
          SCALE: 1 BLOCK = 10 METERS
        </div>
      </div>
    </div>
  );
};
