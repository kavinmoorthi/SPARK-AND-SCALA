import React, { useEffect, useState } from 'react';
import { FusedTelemetry, MissionSummary } from '../types/telemetry';
import {
  Play,
  Pause,
  RotateCcw,
  FastForward,
  Rewind,
  Radio,
  History,
  SkipBack,
  SkipForward,
} from 'lucide-react';

interface TimeTravelReplayProps {
  isLive: boolean;
  setIsLive: (live: boolean) => void;
  history: FusedTelemetry[];
  currentIndex: number;
  onScrub: (index: number) => void;
  missions: MissionSummary[];
  selectedMissionId: string;
  onSelectMission: (id: string) => void;
}

export const TimeTravelReplay: React.FC<TimeTravelReplayProps> = ({
  isLive,
  setIsLive,
  history,
  currentIndex,
  onScrub,
  missions,
  selectedMissionId,
  onSelectMission,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);

  // Playback timer loop
  useEffect(() => {
    if (isLive || !isPlaying || history.length === 0) return;

    const intervalMs = Math.max(40, 200 / playbackSpeed);
    const timer = setInterval(() => {
      onScrub(Math.min(history.length - 1, (currentIndex + 1) % history.length));
    }, intervalMs);

    return () => clearInterval(timer);
  }, [isLive, isPlaying, playbackSpeed, currentIndex, history.length, onScrub]);

  const currentFrame = history[currentIndex] || history[history.length - 1];
  const timeStr = currentFrame ? new Date(currentFrame.raw.ts).toLocaleTimeString() : '--:--:--';

  return (
    <div className="w-full rounded-2xl bg-abyss-950/90 border border-slate-800/90 backdrop-blur-md p-3.5 shadow-2xl flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: Live vs Replay Switcher + Mission Selector */}
        <div className="flex items-center gap-3">
          <div className="flex rounded-xl bg-abyss-900 border border-slate-800 p-1">
            <button
              onClick={() => {
                setIsLive(true);
                setIsPlaying(false);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                isLive
                  ? 'bg-biolum-cyan text-abyss-950 shadow-[0_0_12px_rgba(0,242,254,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Radio className={`w-3.5 h-3.5 ${isLive ? 'animate-pulse' : ''}`} />
              <span>LIVE STREAM</span>
            </button>

            <button
              onClick={() => {
                setIsLive(false);
                setIsPlaying(true);
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
                !isLive
                  ? 'bg-biolum-teal text-abyss-950 shadow-[0_0_12px_rgba(5,213,178,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>REPLAY MISSION</span>
            </button>
          </div>

          {/* Mission Dropdown */}
          <select
            value={selectedMissionId}
            onChange={(e) => onSelectMission(e.target.value)}
            className="bg-abyss-900 border border-slate-800 text-slate-200 text-xs font-mono rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-biolum-cyan"
          >
            {missions.map((m) => (
              <option key={m.missionId} value={m.missionId}>
                {m.missionId} ({m.totalSamples} pts) - {m.homingState}
              </option>
            ))}
          </select>
        </div>

        {/* Center: Playback Controls */}
        {!isLive && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onScrub(0)}
              title="First Frame"
              className="p-1.5 rounded-lg bg-abyss-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="p-2 rounded-xl bg-biolum-cyan text-abyss-950 font-bold hover:scale-105 active:scale-95 transition-all shadow-[0_0_10px_rgba(0,242,254,0.4)]"
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <button
              onClick={() => onScrub(history.length - 1)}
              title="Last Frame"
              className="p-1.5 rounded-lg bg-abyss-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>

            {/* Speed multipliers */}
            <div className="flex rounded-lg bg-abyss-900 border border-slate-800 p-0.5 ml-2">
              {[1, 2, 5].map((speed) => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                    playbackSpeed === speed
                      ? 'bg-biolum-cyan/20 text-biolum-cyan'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Right: Timestamp and Frame Counter */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <div className="text-slate-400">
            FRAME: <b className="text-biolum-cyan">{currentIndex + 1}</b> / {history.length}
          </div>
          <div className="px-2.5 py-1 rounded bg-abyss-900 border border-slate-800 text-slate-300 font-bold">
            {timeStr}
          </div>
        </div>
      </div>

      {/* Scrubber Progress Slider */}
      <div className="flex items-center gap-2 mt-1">
        <input
          type="range"
          min="0"
          max={Math.max(0, history.length - 1)}
          value={currentIndex}
          onChange={(e) => {
            if (isLive) setIsLive(false);
            onScrub(Number(e.target.value));
          }}
          className="w-full accent-biolum-cyan h-2 bg-slate-800 rounded-lg cursor-pointer transition-all"
        />
      </div>
    </div>
  );
};
