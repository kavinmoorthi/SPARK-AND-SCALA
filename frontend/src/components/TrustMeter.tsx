import React from 'react';
import { TrustMetrics } from '../types/telemetry';
import { ShieldCheck, Activity, Eye, Gauge } from 'lucide-react';

interface TrustMeterProps {
  metrics: TrustMetrics;
  ntu: number;
}

export const TrustMeter: React.FC<TrustMeterProps> = ({ metrics, ntu }) => {
  const getScaleColor = (scale: number) => {
    if (scale <= 1.0) return 'text-biolum-emerald border-biolum-emerald/40 bg-biolum-emerald/10';
    if (scale <= 2.5) return 'text-alert-amber border-alert-amber/40 bg-alert-amber/10';
    return 'text-alert-crimson border-alert-crimson/40 bg-alert-crimson/10';
  };

  const getNtuZone = (val: number) => {
    if (val < 20) return { label: 'CLEAR BASIN (R × 1.0)', badge: 'bg-emerald-500/20 text-emerald-400' };
    if (val < 100) return { label: 'BENTHIC SILT (R × 2.5)', badge: 'bg-amber-500/20 text-amber-400' };
    return { label: 'SEDIMENT PLUME (R × 5.0)', badge: 'bg-rose-500/20 text-rose-400' };
  };

  const zone = getNtuZone(ntu);

  return (
    <div className="rounded-2xl bg-abyss-900/70 border border-slate-800/80 backdrop-blur-md p-4 flex flex-col justify-between shadow-2xl relative overflow-hidden">
      {/* Background Glow */}
      <div
        className="absolute -top-12 -right-12 w-36 h-36 rounded-full blur-3xl pointer-events-none transition-colors duration-700"
        style={{
          background:
            metrics.turbidityScale >= 5.0
              ? 'rgba(255, 71, 87, 0.15)'
              : metrics.turbidityScale >= 2.5
              ? 'rgba(255, 159, 28, 0.15)'
              : 'rgba(0, 242, 254, 0.15)',
        }}
      />

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-biolum-cyan" />
          <h3 className="font-display font-semibold text-xs tracking-wider text-slate-200 uppercase">
            SENSOR TRUST & ADAPTIVE NOISE
          </h3>
        </div>
        <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-tight ${zone.badge}`}>
          {zone.label}
        </span>
      </div>

      {/* Main Gauges Grid */}
      <div className="grid grid-cols-2 gap-3 my-3">
        {/* IMU Trust */}
        <div className="p-3 rounded-xl bg-abyss-950/70 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-mono text-[11px]">
              <Activity className="w-3.5 h-3.5 text-sensor-imu" />
              MPU6050 (IMU)
            </span>
            <span className="font-mono font-bold text-slate-200">
              {(metrics.imuTrust * 100).toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden mt-2 border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-sensor-imu transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(100, Math.max(5, metrics.imuTrust * 100))}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-1.5 text-[9px] text-slate-500 font-mono">
            <span>DRIFT COMPENSATED</span>
            <span>GAIN: {(metrics.imuTrust * 0.85).toFixed(2)}</span>
          </div>
        </div>

        {/* Depth Sensor Trust */}
        <div className="p-3 rounded-xl bg-abyss-950/70 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5 font-mono text-[11px]">
              <Gauge className="w-3.5 h-3.5 text-sensor-depth" />
              MS5837 (DEPTH)
            </span>
            <span className="font-mono font-bold text-slate-200">
              {(metrics.depthTrust * 100).toFixed(0)}%
            </span>
          </div>
          <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden mt-2 border border-slate-800">
            <div
              className="h-full bg-gradient-to-r from-teal-500 to-sensor-depth transition-all duration-500 rounded-full"
              style={{ width: `${Math.min(100, Math.max(5, metrics.depthTrust * 100))}%` }}
            />
          </div>
          <div className="flex justify-between items-center mt-1.5 text-[9px] text-slate-500 font-mono">
            <span>PRESSURE PORT</span>
            <span>R_scale: {metrics.turbidityScale.toFixed(1)}x</span>
          </div>
        </div>
      </div>

      {/* Turbidity Noise Multiplier & Overall Confidence */}
      <div className="p-3 rounded-xl bg-abyss-950/80 border border-slate-800/80 flex items-center justify-between">
        <div>
          <div className="text-[10px] font-mono text-slate-400">MEASUREMENT COVARIANCE SCALING</div>
          <div className="flex items-baseline gap-2 mt-0.5">
            <span className="text-xl font-display font-bold text-slate-100">
              R = R₀ × {metrics.turbidityScale.toFixed(1)}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              ({ntu.toFixed(1)} NTU)
            </span>
          </div>
        </div>

        <div className="text-right">
          <div className="text-[10px] font-mono text-slate-400">FILTER CONFIDENCE</div>
          <div className="flex items-center gap-1.5 justify-end mt-0.5">
            <div
              className={`w-2 h-2 rounded-full animate-ping ${
                metrics.filterConfidence > 75 ? 'bg-biolum-emerald' : 'bg-alert-amber'
              }`}
            />
            <span className="text-lg font-display font-bold text-biolum-cyan">
              {metrics.filterConfidence.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Footer Math Caption */}
      <div className="mt-2.5 text-[10px] font-mono text-slate-500 flex items-center justify-between px-1">
        <span>Kalman Gain K = P·Hᵀ / (H·P·Hᵀ + R)</span>
        <span className="text-biolum-cyan/80">Adaptive Silt Rejection</span>
      </div>
    </div>
  );
};
