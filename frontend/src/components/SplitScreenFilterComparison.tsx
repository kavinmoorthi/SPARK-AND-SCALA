import React, { useState } from 'react';
import { FusedTelemetry } from '../types/telemetry';
import { TrendingDown, Sliders, ArrowRight } from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';

interface SplitScreenFilterComparisonProps {
  currentTelemetry: FusedTelemetry | null;
  history: FusedTelemetry[];
}

export const SplitScreenFilterComparison: React.FC<SplitScreenFilterComparisonProps> = ({
  currentTelemetry,
  history,
}) => {
  const [sliderPos, setSliderPos] = useState(50); // 0 to 100% split

  const fixedRmse = currentTelemetry?.rmseFixed ?? 1.65;
  const adaptiveRmse = currentTelemetry?.rmseAdaptive ?? 0.88;
  const improvement = currentTelemetry?.improvementPct ?? 46.7;

  // Downsample last 35 points for smooth Recharts rendering
  const chartData = history.slice(-35).map((h, i) => {
    const errFixed = Math.sqrt(
      Math.pow(h.fixedFilter.x - h.groundTruth.x, 2) +
      Math.pow(h.fixedFilter.y - h.groundTruth.y, 2) +
      Math.pow(h.fixedFilter.depth - h.groundTruth.depth, 2)
    );
    const errAdaptive = Math.sqrt(
      Math.pow(h.adaptiveFilter.x - h.groundTruth.x, 2) +
      Math.pow(h.adaptiveFilter.y - h.groundTruth.y, 2) +
      Math.pow(h.adaptiveFilter.depth - h.groundTruth.depth, 2)
    );

    return {
      time: `${i * 2}s`,
      errFixed: Number(errFixed.toFixed(2)),
      errAdaptive: Number(errAdaptive.toFixed(2)),
      ntu: Number(h.raw.ntu.toFixed(1)),
    };
  });

  return (
    <div className="rounded-2xl bg-abyss-900/70 border border-slate-800/80 backdrop-blur-md p-4 flex flex-col justify-between shadow-2xl relative overflow-hidden">
      {/* Header with Research Metric */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-biolum-cyan" />
          <h3 className="font-display font-semibold text-xs tracking-wider text-slate-200 uppercase">
            FILTER COMPARISON: FIXED VS. TURBIDITY-ADAPTIVE
          </h3>
        </div>

        {/* Live Improvement Badge */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-gradient-to-r from-biolum-cyan/20 to-biolum-teal/20 border border-biolum-cyan/50 shadow-[0_0_15px_rgba(0,242,254,0.2)]">
          <TrendingDown className="w-4 h-4 text-biolum-cyan" />
          <span className="text-xs font-mono font-bold text-slate-200">
            ERROR REDUCED BY{' '}
            <b className="text-biolum-cyan font-display text-sm tracking-wide">
              {improvement.toFixed(1)}%
            </b>
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 my-3">
        <div className="p-3 rounded-xl bg-abyss-950/70 border border-alert-amber/30 flex flex-col">
          <div className="text-[10px] font-mono text-alert-amber flex items-center justify-between">
            <span>FILTER A (FIXED NOISE R₀)</span>
            <span className="text-[9px] text-slate-500">BASELINE</span>
          </div>
          <div className="text-2xl font-display font-bold text-slate-100 mt-1 flex items-baseline gap-1">
            <span>{fixedRmse.toFixed(2)}</span>
            <span className="text-xs font-mono text-slate-400">m RMSE</span>
          </div>
          <p className="text-[10px] font-mono text-slate-500 mt-1">
            Over-reacts to corrupted readings in murky zones.
          </p>
        </div>

        <div className="p-3 rounded-xl bg-abyss-950/70 border border-biolum-cyan/40 flex flex-col shadow-[0_0_15px_rgba(0,242,254,0.1)]">
          <div className="text-[10px] font-mono text-biolum-cyan flex items-center justify-between">
            <span>FILTER B (TURBIDITY-ADAPTIVE)</span>
            <span className="text-[9px] text-biolum-emerald font-bold">THESIS NOVELTY</span>
          </div>
          <div className="text-2xl font-display font-bold text-biolum-cyan mt-1 flex items-baseline gap-1">
            <span>{adaptiveRmse.toFixed(2)}</span>
            <span className="text-xs font-mono text-slate-400">m RMSE</span>
          </div>
          <p className="text-[10px] font-mono text-slate-400 mt-1">
            Dampens sensor gain as turbidity rises (R × scale).
          </p>
        </div>
      </div>

      {/* Real-time Tracking Error Comparison Chart */}
      <div className="w-full h-44 my-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" />
            <XAxis dataKey="time" stroke="#64748B" tick={{ fontSize: 9 }} />
            <YAxis stroke="#64748B" tick={{ fontSize: 9 }} unit="m" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#060B14',
                borderColor: '#1E293B',
                borderRadius: '8px',
                fontSize: '11px',
                fontFamily: 'monospace',
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '10px', fontFamily: 'monospace', paddingTop: '4px' }}
            />
            <Line
              type="monotone"
              dataKey="errFixed"
              name="Fixed Noise Error"
              stroke="#FF9F1C"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="errAdaptive"
              name="Adaptive Fused Error"
              stroke="#00F2FE"
              strokeWidth={2.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Draggable Split Slider Control */}
      <div className="mt-2 p-2 rounded-xl bg-abyss-950/80 border border-slate-800 flex items-center gap-3">
        <span className="text-[10px] font-mono text-alert-amber font-bold">FIXED</span>
        <input
          type="range"
          min="0"
          max="100"
          value={sliderPos}
          onChange={(e) => setSliderPos(Number(e.target.value))}
          className="flex-1 accent-biolum-cyan h-1.5 bg-slate-800 rounded-lg cursor-pointer"
        />
        <span className="text-[10px] font-mono text-biolum-cyan font-bold">ADAPTIVE</span>
        <span className="text-[10px] font-mono text-slate-400">{sliderPos}% Split</span>
      </div>
    </div>
  );
};
