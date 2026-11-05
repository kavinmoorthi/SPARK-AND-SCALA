import React, { useState, useRef, useEffect } from 'react';
import { HomingStatus } from '../types/telemetry';
import { triggerHoming } from '../services/api';
import { sound } from '../services/sound';
import { Anchor, Compass, Radio, AlertTriangle, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';

interface HomingCompassProps {
  status: HomingStatus;
  heading: number;
}

export const HomingCompass: React.FC<HomingCompassProps> = ({ status, heading }) => {
  const [holding, setHolding] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0); // 0 to 100
  const holdIntervalRef = useRef<number | null>(null);

  // Trigger celebration confetti when vehicle arrives at dock
  const previousStateRef = useRef<string>(status.state);
  useEffect(() => {
    if (previousStateRef.current !== 'DOCKED' && status.state === 'DOCKED') {
      sound.playDockingSuccess();
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#00F2FE', '#00E676', '#4FACFE'],
      });
    }
    if (status.state === 'HOMING' && previousStateRef.current !== 'HOMING') {
      sound.playWarningChime();
    }
    previousStateRef.current = status.state;
  }, [status.state]);

  const startHold = () => {
    if (status.state === 'HOMING' || status.state === 'DOCKED') return;
    setHolding(true);
    const startTime = Date.now();
    const duration = 1200; // 1.2 seconds hold

    holdIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(100, (elapsed / duration) * 100);
      setHoldProgress(progress);

      if (progress >= 100) {
        if (holdIntervalRef.current) clearInterval(holdIntervalRef.current);
        setHolding(false);
        setHoldProgress(0);
        sound.playWarningChime();
        triggerHoming().catch(console.error);
      }
    }, 20);
  };

  const cancelHold = () => {
    setHolding(false);
    setHoldProgress(0);
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  const isHoming = status.state === 'HOMING' || status.state === 'LOW_BATTERY';
  const isDocked = status.state === 'DOCKED';

  // Relative angle of the beacon from the current vehicle heading
  const relativeBeaconBearing = (status.beaconBearing - heading + 360) % 360;

  return (
    <div className="rounded-2xl bg-abyss-900/70 border border-slate-800/80 backdrop-blur-md p-4 flex flex-col justify-between shadow-2xl relative overflow-hidden">
      {/* Active Homing Pulsing Glow Ring */}
      {isHoming && (
        <div className="absolute inset-0 border-2 border-alert-amber rounded-2xl animate-pulse pointer-events-none shadow-[0_0_25px_rgba(255,159,28,0.3)_inset]" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <Anchor className="w-4 h-4 text-biolum-cyan" />
          <h3 className="font-display font-semibold text-xs tracking-wider text-slate-200 uppercase">
            HOMING INTELLIGENCE & GUIDANCE
          </h3>
        </div>
        <div
          className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider ${
            isDocked
              ? 'bg-biolum-emerald/20 text-biolum-emerald border border-biolum-emerald/40'
              : isHoming
              ? 'bg-alert-amber/20 text-alert-amber border border-alert-amber/40 animate-pulse'
              : 'bg-slate-800/80 text-slate-300 border border-slate-700'
          }`}
        >
          {isDocked ? (
            <>
              <CheckCircle2 className="w-3 h-3 text-biolum-emerald" />
              <span>DOCKED</span>
            </>
          ) : isHoming ? (
            <>
              <Radio className="w-3 h-3 text-alert-amber animate-spin" />
              <span>HOMING ACTIVE</span>
            </>
          ) : (
            <span>MISSION SURVEY</span>
          )}
        </div>
      </div>

      {/* Compass & Distance Display */}
      <div className="flex items-center justify-around my-3">
        {/* Radial Compass Dial */}
        <div className="relative w-36 h-36 rounded-full border border-slate-700 bg-abyss-950/80 flex items-center justify-center shadow-inner">
          {/* Compass ticks & cardinal directions */}
          <div className="absolute inset-1 rounded-full border border-dashed border-slate-800 flex items-center justify-center">
            <span className="absolute top-1 text-[9px] font-mono font-bold text-biolum-cyan">N</span>
            <span className="absolute right-1.5 text-[9px] font-mono font-bold text-slate-500">E</span>
            <span className="absolute bottom-1 text-[9px] font-mono font-bold text-slate-500">S</span>
            <span className="absolute left-1.5 text-[9px] font-mono font-bold text-slate-500">W</span>
          </div>

          {/* Heading Ring (rotates with vehicle heading) */}
          <div
            className="absolute inset-0 flex items-center justify-center transition-transform duration-300"
            style={{ transform: `rotate(${-heading}deg)` }}
          >
            <div className="absolute top-0 w-1.5 h-3 bg-biolum-cyan rounded-full shadow-[0_0_6px_#00F2FE]" />
          </div>

          {/* Beacon Needle (points directly to beacon) */}
          <div
            className="absolute inset-0 flex items-center justify-center transition-transform duration-300"
            style={{ transform: `rotate(${relativeBeaconBearing}deg)` }}
          >
            <div className="flex flex-col items-center">
              <div
                className={`w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent ${
                  isHoming
                    ? 'border-b-[26px] border-b-alert-amber filter drop-shadow-[0_0_8px_rgba(255,159,28,0.8)]'
                    : 'border-b-[26px] border-b-biolum-cyan filter drop-shadow-[0_0_8px_rgba(0,242,254,0.6)]'
                }`}
              />
              <div className="w-1 h-8 bg-slate-600 rounded-full" />
            </div>
          </div>

          {/* Center Hub */}
          <div className="w-6 h-6 rounded-full bg-abyss-900 border border-slate-600 z-10 flex items-center justify-center">
            <div
              className={`w-2 h-2 rounded-full ${
                isDocked ? 'bg-biolum-emerald' : isHoming ? 'bg-alert-amber animate-ping' : 'bg-biolum-cyan'
              }`}
            />
          </div>
        </div>

        {/* Distance & Bearing Readouts */}
        <div className="flex flex-col gap-2 font-mono">
          <div className="p-2.5 rounded-xl bg-abyss-950/70 border border-slate-800">
            <div className="text-[10px] text-slate-400">BEACON DISTANCE</div>
            <div className="text-xl font-display font-bold text-slate-100 flex items-baseline gap-1">
              <span>{status.beaconDistance.toFixed(1)}</span>
              <span className="text-xs text-biolum-cyan font-mono">METERS</span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-abyss-950/70 border border-slate-800">
            <div className="text-[10px] text-slate-400">BEARING TO DOCK</div>
            <div className="text-base font-display font-bold text-biolum-teal flex items-baseline gap-1">
              <span>{status.beaconBearing.toFixed(1)}°</span>
              <span className="text-[10px] text-slate-500 font-mono">AZIMUTH</span>
            </div>
          </div>
        </div>
      </div>

      {/* State Machine Reason Banner */}
      <div className="p-2 rounded-lg bg-abyss-950/60 border border-slate-800/80 text-[10px] font-mono text-slate-400 truncate mb-3">
        <span className="text-biolum-cyan font-bold">STATE REASON: </span>
        {status.triggerReason || 'Standard survey transit active'}
      </div>

      {/* Hold-to-Confirm Emergency "RETURN HOME" Button */}
      <div className="relative">
        <button
          onMouseDown={startHold}
          onMouseUp={cancelHold}
          onMouseLeave={cancelHold}
          onTouchStart={startHold}
          onTouchEnd={cancelHold}
          disabled={isHoming || isDocked}
          className={`w-full py-3 px-4 rounded-xl font-display font-bold text-xs uppercase tracking-wider relative overflow-hidden transition-all duration-300 select-none shadow-lg ${
            isDocked
              ? 'bg-emerald-950/50 border border-emerald-700/60 text-emerald-400 cursor-not-allowed'
              : isHoming
              ? 'bg-amber-950/50 border border-amber-600 text-amber-300 cursor-not-allowed shadow-[0_0_15px_rgba(255,159,28,0.3)]'
              : 'bg-gradient-to-r from-alert-amber/20 to-alert-crimson/20 border border-alert-amber/50 hover:border-alert-amber text-slate-200 active:scale-[0.98]'
          }`}
        >
          {/* Circular/Linear Hold Progress Bar */}
          {holding && (
            <div
              className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-alert-amber to-alert-crimson opacity-40 transition-all duration-75"
              style={{ width: `${holdProgress}%` }}
            />
          )}

          <div className="relative z-10 flex items-center justify-center gap-2">
            {isDocked ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>AUV SAFELY DOCKED</span>
              </>
            ) : isHoming ? (
              <>
                <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>HOMING TRANSIT IN PROGRESS</span>
              </>
            ) : holding ? (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-400 animate-bounce" />
                <span>HOLD TO CONFIRM... ({Math.round(holdProgress)}%)</span>
              </>
            ) : (
              <>
                <Anchor className="w-4 h-4 text-alert-amber" />
                <span>HOLD 1.2S TO RETURN HOME</span>
              </>
            )}
          </div>
        </button>
      </div>
    </div>
  );
};
