import React from 'react';
import { MissionEvent } from '../types/telemetry';
import {
  AlertTriangle,
  BatteryCharging,
  CloudFog,
  Radio,
  CheckCircle2,
  Clock,
  ChevronRight,
} from 'lucide-react';

interface EventTimelineProps {
  events: MissionEvent[];
  onSelectEvent: (event: MissionEvent) => void;
}

export const EventTimeline: React.FC<EventTimelineProps> = ({ events, onSelectEvent }) => {
  const getEventIcon = (type: string) => {
    switch (type) {
      case 'TURBIDITY_SPIKE':
        return <CloudFog className="w-3.5 h-3.5 text-alert-amber" />;
      case 'LOW_BATTERY':
        return <BatteryCharging className="w-3.5 h-3.5 text-alert-crimson" />;
      case 'LINK_LOST':
        return <Radio className="w-3.5 h-3.5 text-alert-crimson" />;
      case 'HOMING':
      case 'HOMING_TRIGGERED':
        return <AlertTriangle className="w-3.5 h-3.5 text-alert-amber" />;
      case 'DOCKED':
        return <CheckCircle2 className="w-3.5 h-3.5 text-biolum-emerald" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-biolum-cyan" />;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'WARNING':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'SUCCESS':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      default:
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30';
    }
  };

  return (
    <div className="rounded-2xl bg-abyss-900/70 border border-slate-800/80 backdrop-blur-md p-4 flex flex-col justify-between shadow-2xl relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-biolum-cyan" />
          <h3 className="font-display font-semibold text-xs tracking-wider text-slate-200 uppercase">
            EVENT TIMELINE (CLICK TO JUMP)
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-500">
          {events.length} EVENTS RECORDED
        </span>
      </div>

      {/* Events List */}
      <div className="flex flex-col gap-2 my-2 max-h-48 overflow-y-auto pr-1 select-none custom-scrollbar">
        {events.length === 0 ? (
          <div className="text-center py-6 text-xs font-mono text-slate-500">
            No anomalous events recorded yet. Mission nominal.
          </div>
        ) : (
          events.map((evt) => {
            const timeStr = new Date(evt.ts).toLocaleTimeString();
            return (
              <button
                key={evt.id}
                onClick={() => onSelectEvent(evt)}
                className="w-full text-left p-2 rounded-xl bg-abyss-950/70 hover:bg-abyss-950 border border-slate-800 hover:border-biolum-cyan/50 transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded-lg bg-abyss-900 border border-slate-700">
                    {getEventIcon(evt.eventType)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-200">
                        {evt.eventType}
                      </span>
                      <span
                        className={`px-1.5 py-0.2 rounded text-[9px] font-mono border ${getSeverityBadge(
                          evt.severity
                        )}`}
                      >
                        {evt.severity}
                      </span>
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate max-w-[200px]">
                      {evt.description}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500 group-hover:text-biolum-cyan">
                  <span>{timeStr}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="text-[9px] font-mono text-slate-500 text-center">
        Tip: Click any event badge to scrub time-travel replay directly to that event.
      </div>
    </div>
  );
};
