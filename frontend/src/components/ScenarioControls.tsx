import React, { useState } from 'react';
import { injectScenario } from '../services/api';
import {
  SlidersHorizontal,
  CloudRain,
  Compass,
  WifiOff,
  BatteryLow,
  RotateCcw,
  Zap,
} from 'lucide-react';

export const ScenarioControls: React.FC = () => {
  const [spikeNtu, setSpikeNtu] = useState(180);
  const [spikeDuration, setSpikeDuration] = useState(15);
  const [driftFactor, setDriftFactor] = useState(2.5);
  const [signalLost, setSignalLost] = useState(false);
  const [fastDrain, setFastDrain] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleTurbiditySpike = async () => {
    try {
      await injectScenario({ turbiditySpike: spikeNtu, spikeDurationSec: spikeDuration });
      showToast(`Sediment Plume Injected: ${spikeNtu} NTU for ${spikeDuration}s`);
    } catch {
      showToast('Failed to inject turbidity spike');
    }
  };

  const handleDriftChange = async (val: number) => {
    setDriftFactor(val);
    try {
      await injectScenario({ imuDriftFactor: val });
      showToast(`IMU Bias Drift set to ${val.toFixed(1)}x`);
    } catch {
      // ignore
    }
  };

  const handleToggleSignalLoss = async () => {
    const next = !signalLost;
    setSignalLost(next);
    try {
      await injectScenario({ signalLoss: next });
      showToast(next ? 'Telemetry Link CUT - Homing Fail-Safe Active' : 'Telemetry Link Restored');
    } catch {
      // ignore
    }
  };

  const handleToggleFastDrain = async () => {
    const next = !fastDrain;
    setFastDrain(next);
    try {
      await injectScenario({ drainBatteryFast: next });
      showToast(next ? 'Accelerated Battery Drain Active (<20% homing trigger)' : 'Normal Drain Rate');
    } catch {
      // ignore
    }
  };

  const handleReset = async () => {
    try {
      await injectScenario({ resetMission: true, signalLoss: false, drainBatteryFast: false, imuDriftFactor: 1.0 });
      setSignalLost(false);
      setFastDrain(false);
      setDriftFactor(1.0);
      showToast('Mission Reset to Lake Survey Baseline');
    } catch {
      showToast('Failed to reset mission');
    }
  };

  return (
    <div className="rounded-2xl bg-abyss-900/70 border border-slate-800/80 backdrop-blur-md p-4 flex flex-col justify-between shadow-2xl relative overflow-hidden">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="absolute top-2 right-4 z-20 px-3 py-1.5 rounded-lg bg-biolum-cyan text-abyss-950 font-mono text-xs font-bold shadow-lg animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-alert-amber" />
          <h3 className="font-display font-semibold text-xs tracking-wider text-slate-200 uppercase">
            SCENARIO ANOMALY INJECTION (DEFENSE DEMO)
          </h3>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-abyss-950 border border-slate-700 hover:border-slate-500 text-[10px] font-mono text-slate-300 hover:text-white transition-all"
        >
          <RotateCcw className="w-3 h-3" />
          <span>RESET</span>
        </button>
      </div>

      {/* Controls Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 my-3">
        {/* Turbidity Plume Injection */}
        <div className="p-3 rounded-xl bg-abyss-950/70 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-300 font-mono">
            <span className="flex items-center gap-1.5">
              <CloudRain className="w-3.5 h-3.5 text-alert-amber" />
              TURBIDITY SPIKE
            </span>
            <span className="font-bold text-alert-amber">{spikeNtu} NTU</span>
          </div>

          <div className="my-2">
            <input
              type="range"
              min="30"
              max="240"
              step="10"
              value={spikeNtu}
              onChange={(e) => setSpikeNtu(Number(e.target.value))}
              className="w-full accent-alert-amber h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <button
            onClick={handleTurbiditySpike}
            className="w-full py-1.5 rounded-lg bg-alert-amber/20 hover:bg-alert-amber/30 border border-alert-amber/50 text-alert-amber text-xs font-mono font-bold transition-all"
          >
            INJECT SILT CLOUD ({spikeDuration}s)
          </button>
        </div>

        {/* IMU Gyro Drift Multiplier */}
        <div className="p-3 rounded-xl bg-abyss-950/70 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-300 font-mono">
            <span className="flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-sensor-imu" />
              IMU DRIFT BIAS
            </span>
            <span className="font-bold text-sensor-imu">{driftFactor.toFixed(1)}x</span>
          </div>

          <div className="my-2">
            <input
              type="range"
              min="0.5"
              max="5.0"
              step="0.5"
              value={driftFactor}
              onChange={(e) => handleDriftChange(Number(e.target.value))}
              className="w-full accent-purple-500 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
            />
          </div>

          <div className="flex justify-between text-[10px] font-mono text-slate-500">
            <span>LOW DRIFT (0.5x)</span>
            <span>HIGH DRIFT (5.0x)</span>
          </div>
        </div>

        {/* Emergency Triggers (Signal Loss & Battery Drain) */}
        <div className="p-3 rounded-xl bg-abyss-950/70 border border-slate-800 flex flex-col justify-between gap-2">
          <button
            onClick={handleToggleSignalLoss}
            className={`w-full py-2 px-3 rounded-lg border font-mono text-xs font-bold flex items-center justify-between transition-all ${
              signalLost
                ? 'bg-red-500/30 border-red-500 text-red-200 shadow-[0_0_12px_rgba(239,68,68,0.4)]'
                : 'bg-abyss-900 border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <WifiOff className="w-3.5 h-3.5" />
              SIGNAL LOSS (FAIL-SAFE)
            </span>
            <span>{signalLost ? 'ACTIVE' : 'OFF'}</span>
          </button>

          <button
            onClick={handleToggleFastDrain}
            className={`w-full py-2 px-3 rounded-lg border font-mono text-xs font-bold flex items-center justify-between transition-all ${
              fastDrain
                ? 'bg-amber-500/30 border-amber-500 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                : 'bg-abyss-900 border-slate-700 text-slate-300 hover:border-slate-500'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <BatteryLow className="w-3.5 h-3.5" />
              FAST BATTERY DRAIN
            </span>
            <span>{fastDrain ? 'DRAINING' : 'OFF'}</span>
          </button>
        </div>
      </div>

      <div className="text-[10px] font-mono text-slate-500 text-center">
        Use these scenario controls during the final-year review to trigger real-time turbidity spikes and watch the adaptive Kalman filter dynamically reject the noise.
      </div>
    </div>
  );
};
