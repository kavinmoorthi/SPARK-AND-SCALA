import React from 'react';
import { FusedTelemetry } from '../types/telemetry';
import { sound } from '../services/sound';
import {
  Battery,
  BatteryCharging,
  BatteryWarning,
  Gauge,
  Compass,
  Radio,
  Volume2,
  VolumeX,
  Sun,
  Moon,
  FileSpreadsheet,
  Activity,
  Layers,
} from 'lucide-react';

interface TelemetryReadoutsProps {
  telemetry: FusedTelemetry | null;
  isConnected: boolean;
  activeTab: 'cockpit' | 'comparison' | 'analytics';
  setActiveTab: (tab: 'cockpit' | 'comparison' | 'analytics') => void;
  onOpenReport: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  reducedMotion: boolean;
  setReducedMotion: (motion: boolean) => void;
}

export const TelemetryReadouts: React.FC<TelemetryReadoutsProps> = ({
  telemetry,
  isConnected,
  activeTab,
  setActiveTab,
  onOpenReport,
  soundEnabled,
  setSoundEnabled,
  reducedMotion,
  setReducedMotion,
}) => {
  const batteryVal = telemetry?.raw.battery ?? 95.0;
  const depthVal = telemetry?.raw.depth ?? 0.5;
  const ntuVal = telemetry?.raw.ntu ?? 12.0;
  const headingVal = telemetry?.raw.heading ?? 45.0;

  const getBatteryIcon = (val: number) => {
    if (val <= 20) return <BatteryWarning className="w-4 h-4 text-alert-crimson animate-pulse" />;
    if (val <= 50) return <Battery className="w-4 h-4 text-alert-amber" />;
    return <BatteryCharging className="w-4 h-4 text-biolum-emerald" />;
  };

  const getNtuColor = (val: number) => {
    if (val < 20) return 'text-biolum-emerald';
    if (val < 100) return 'text-alert-amber';
    return 'text-alert-crimson';
  };

  return (
    <header className="w-full bg-abyss-950/85 border-b border-slate-800/80 backdrop-blur-md px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xl z-20">
      {/* Project Brand & Subtitle */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-biolum-cyan to-biolum-teal flex items-center justify-center shadow-[0_0_15px_rgba(0,242,254,0.4)]">
          <svg className="w-5 h-5 text-abyss-950" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-bold text-sm tracking-wider text-slate-100 uppercase">
              INLAND DEEP CONSOLE
            </h1>
            <span className="px-2 py-0.2 rounded text-[9px] font-mono font-bold bg-biolum-cyan/15 text-biolum-cyan border border-biolum-cyan/30">
              v1.0 • ESP32 + SPARK
            </span>
          </div>
          <p className="text-[10px] font-mono text-slate-400">
            Autonomous Underwater Vehicle Adaptive Fusion & Homing Supervisor
          </p>
        </div>
      </div>

      {/* Primary Telemetry Readouts HUD */}
      <div className="flex items-center gap-2">
        {/* Turbidity */}
        <div className="px-3 py-1 rounded-xl bg-abyss-900 border border-slate-800 flex items-center gap-2">
          <Activity className="w-4 h-4 text-slate-400" />
          <div className="flex flex-col">
            <span className="text-[9px] font-mono text-slate-500">TURBIDITY</span>
            <span className={`text-xs font-mono font-bold ${getNtuColor(ntuVal)}`}>
              {ntuVal.toFixed(1)} <span className="text-[9px] text-slate-400 font-normal">NTU</span>
            </span>
          </div>
        </div>

        {/* Depth */}
        <div className="px-3 py-1 rounded-xl bg-abyss-900 border border-slate-800 flex items-center gap-2">
          <Gauge className="w-4 h-4 text-sensor-depth" />
          <div className="flex flex-col">
            <span className="text-[9px] font-mono text-slate-500">DEPTH</span>
            <span className="text-xs font-mono font-bold text-slate-100">
              {depthVal.toFixed(2)} <span className="text-[9px] text-slate-400 font-normal">m</span>
            </span>
          </div>
        </div>

        {/* Heading */}
        <div className="px-3 py-1 rounded-xl bg-abyss-900 border border-slate-800 flex items-center gap-2">
          <Compass className="w-4 h-4 text-biolum-electric" />
          <div className="flex flex-col">
            <span className="text-[9px] font-mono text-slate-500">HEADING</span>
            <span className="text-xs font-mono font-bold text-slate-100">
              {headingVal.toFixed(1)}°
            </span>
          </div>
        </div>

        {/* Battery */}
        <div className="px-3 py-1 rounded-xl bg-abyss-900 border border-slate-800 flex items-center gap-2">
          {getBatteryIcon(batteryVal)}
          <div className="flex flex-col">
            <span className="text-[9px] font-mono text-slate-500">BATTERY</span>
            <span
              className={`text-xs font-mono font-bold ${
                batteryVal <= 20.0 ? 'text-alert-crimson' : 'text-slate-100'
              }`}
            >
              {batteryVal.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* Link Status */}
        <div className="px-2.5 py-1 rounded-xl bg-abyss-900 border border-slate-800 flex items-center gap-1.5">
          <div
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-biolum-emerald animate-pulse' : 'bg-alert-crimson'
            }`}
          />
          <span className="text-[10px] font-mono font-bold text-slate-300">
            {isConnected ? '5Hz LINK' : 'OFFLINE'}
          </span>
        </div>
      </div>

      {/* Tab Switcher & Utility Actions */}
      <div className="flex items-center gap-2">
        {/* Navigation Tabs */}
        <div className="flex rounded-xl bg-abyss-900 border border-slate-800 p-0.5">
          <button
            onClick={() => setActiveTab('cockpit')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === 'cockpit'
                ? 'bg-biolum-cyan text-abyss-950 shadow-[0_0_10px_rgba(0,242,254,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            COCKPIT
          </button>
          <button
            onClick={() => setActiveTab('comparison')}
            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === 'comparison'
                ? 'bg-biolum-cyan text-abyss-950 shadow-[0_0_10px_rgba(0,242,254,0.3)]'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            FILTER SPLIT
          </button>
        </div>

        {/* Mission Batch Report Button */}
        <button
          onClick={onOpenReport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-abyss-900 hover:bg-slate-800 border border-slate-700 text-xs font-mono text-slate-200 transition-all"
        >
          <FileSpreadsheet className="w-3.5 h-3.5 text-biolum-cyan" />
          <span>REPORT</span>
        </button>

        {/* Audio Toggle */}
        <button
          onClick={() => {
            const next = !soundEnabled;
            setSoundEnabled(next);
            sound.enabled = next;
            if (next) sound.playSonarPing();
          }}
          title={soundEnabled ? 'Mute Sonar Audio' : 'Enable Sonar Audio'}
          className="p-1.5 rounded-xl bg-abyss-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white"
        >
          {soundEnabled ? <Volume2 className="w-4 h-4 text-biolum-cyan" /> : <VolumeX className="w-4 h-4" />}
        </button>

        {/* Reduced Motion Toggle */}
        <button
          onClick={() => setReducedMotion(!reducedMotion)}
          title={reducedMotion ? 'Enable Full Motion' : 'Reduce Motion'}
          className={`px-2 py-1 rounded-xl border text-[10px] font-mono ${
            reducedMotion
              ? 'bg-biolum-cyan/20 border-biolum-cyan text-biolum-cyan'
              : 'bg-abyss-900 border-slate-800 text-slate-400'
          }`}
        >
          {reducedMotion ? 'REDUCED' : 'MOTION'}
        </button>
      </div>
    </header>
  );
};
