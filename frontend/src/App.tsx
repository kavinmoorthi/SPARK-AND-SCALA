import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FusedTelemetry, MissionEvent, MissionSummary } from './types/telemetry';
import {
  fetchMissions,
  fetchMissionTelemetry,
  fetchMissionEvents,
  LiveTelemetrySocket,
  triggerHoming,
} from './services/api';
import { sound } from './services/sound';
import { LivingWaterBackground } from './components/LivingWaterBackground';
import { TelemetryReadouts } from './components/TelemetryReadouts';
import { AuvModel3D } from './components/AuvModel3D';
import { GhostPathMap } from './components/GhostPathMap';
import { TrustMeter } from './components/TrustMeter';
import { HomingCompass } from './components/HomingCompass';
import { SplitScreenFilterComparison } from './components/SplitScreenFilterComparison';
import { EventTimeline } from './components/EventTimeline';
import { ScenarioControls } from './components/ScenarioControls';
import { TimeTravelReplay } from './components/TimeTravelReplay';
import { MissionReportModal } from './components/MissionReportModal';

export const App: React.FC = () => {
  const [telemetry, setTelemetry] = useState<FusedTelemetry | null>(null);
  const [history, setHistory] = useState<FusedTelemetry[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isLive, setIsLive] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<'cockpit' | 'comparison' | 'analytics'>('cockpit');
  const [missions, setMissions] = useState<MissionSummary[]>([]);
  const [selectedMissionId, setSelectedMissionId] = useState<string>('');
  const [events, setEvents] = useState<MissionEvent[]>([]);
  const [isReportOpen, setIsReportOpen] = useState<boolean>(false);

  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [reducedMotion, setReducedMotion] = useState<boolean>(false);

  const liveSocketRef = useRef<LiveTelemetrySocket | null>(null);
  const maxHistoryLength = 400;

  // 1. Load Initial Mission List
  const refreshMissions = useCallback(async () => {
    try {
      const data = await fetchMissions();
      setMissions(data);
      if (data.length > 0 && !selectedMissionId) {
        setSelectedMissionId(data[0].missionId);
      }
    } catch {
      // Backend starting up
    }
  }, [selectedMissionId]);

  useEffect(() => {
    refreshMissions();
    const interval = setInterval(refreshMissions, 8000);
    return () => clearInterval(interval);
  }, [refreshMissions]);

  // 2. Connect Live WebSocket
  useEffect(() => {
    const socket = new LiveTelemetrySocket();
    liveSocketRef.current = socket;

    socket.connect(
      (frame: FusedTelemetry) => {
        setTelemetry(frame);
        if (frame.raw.mission_id && !selectedMissionId) {
          setSelectedMissionId(frame.raw.mission_id);
        }

        setHistory((prev) => {
          const next = [...prev, frame];
          if (next.length > maxHistoryLength) next.shift();
          return next;
        });

        // If in live mode, keep scrubber at the latest frame
        if (isLive) {
          setCurrentIndex((idx) => (idx < maxHistoryLength - 1 ? idx + 1 : maxHistoryLength - 1));
        }
      },
      (connected: boolean) => {
        setIsConnected(connected);
      }
    );

    return () => {
      socket.disconnect();
    };
  }, [isLive, selectedMissionId]);

  // 3. Load Mission Events
  useEffect(() => {
    if (!selectedMissionId) return;
    fetchMissionEvents(selectedMissionId)
      .then(setEvents)
      .catch(() => {});
  }, [selectedMissionId, telemetry?.homingStatus.state]);

  // 4. Handle Mission Selection for Replay
  const handleSelectMission = async (mId: string) => {
    setSelectedMissionId(mId);
    try {
      const missionData = await fetchMissionTelemetry(mId, 800);
      if (missionData.length > 0) {
        setHistory(missionData);
        setCurrentIndex(0);
        setTelemetry(missionData[0]);
        setIsLive(false);
      }
      const evts = await fetchMissionEvents(mId);
      setEvents(evts);
    } catch (err) {
      console.error('Failed to load mission replay', err);
    }
  };

  // 5. Handle Time-Travel Scrubber scrub
  const handleScrub = (index: number) => {
    setCurrentIndex(index);
    if (history[index]) {
      setTelemetry(history[index]);
    }
  };

  // 6. Handle Clicking Event to Jump
  const handleSelectEvent = (evt: MissionEvent) => {
    if (history.length === 0) return;
    setIsLive(false);
    // Find closest frame to event timestamp
    let closestIdx = 0;
    let minDiff = Infinity;
    history.forEach((h, idx) => {
      const diff = Math.abs(h.raw.ts - evt.ts);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });
    handleScrub(closestIdx);
  };

  // 7. Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;

      if (e.code === 'Space') {
        e.preventDefault();
        setIsLive((prev) => !prev);
      } else if (e.key === '1') {
        setActiveTab('cockpit');
      } else if (e.key === '2') {
        setActiveTab('comparison');
      } else if (e.key === 'r' || e.key === 'R') {
        setIsLive((prev) => !prev);
      } else if (e.key === 'p' || e.key === 'P' || e.key === 'm' || e.key === 'M') {
        setIsReportOpen((prev) => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const activeDisplay = telemetry || {
    raw: {
      mission_id: selectedMissionId || 'MISSION-ALPHA',
      ts: Date.now(),
      depth: 0.5,
      ax: 0,
      ay: 0,
      az: 9.81,
      gx: 0,
      gy: 0,
      gz: 0,
      heading: 45.0,
      ntu: 12.0,
      battery: 98.0,
    },
    groundTruth: { x: 0, y: 0, depth: 0.5, vx: 0, vy: 0, vz: 0, roll: 0, pitch: 0, yaw: 45 },
    fixedFilter: {
      x: 0,
      y: 0,
      depth: 0.5,
      vx: 0,
      vy: 0,
      vz: 0,
      roll: 0,
      pitch: 0,
      yaw: 45,
      uncertaintyTrace: 1.0,
      noiseScale: 1.0,
    },
    adaptiveFilter: {
      x: 0,
      y: 0,
      depth: 0.5,
      vx: 0,
      vy: 0,
      vz: 0,
      roll: 0,
      pitch: 0,
      yaw: 45,
      uncertaintyTrace: 0.6,
      noiseScale: 1.0,
    },
    deadReckoning: { x: 0, y: 0, depth: 0.5, vx: 0, vy: 0, heading: 45 },
    trustMetrics: { imuTrust: 0.95, depthTrust: 0.98, turbidityScale: 1.0, filterConfidence: 96.0 },
    homingStatus: {
      state: 'NORMAL' as const,
      triggerReason: 'Mission nominal survey execution',
      beaconDistance: 18.5,
      beaconBearing: 220.0,
      isDocked: false,
      batteryRemaining: 98.0,
    },
    rmseFixed: 1.45,
    rmseAdaptive: 0.82,
    improvementPct: 43.4,
    driftHaloRadius: 1.2,
  };

  return (
    <div className={`relative min-h-screen flex flex-col justify-between overflow-x-hidden ${reducedMotion ? 'motion-reduce' : ''}`}>
      {/* 1. Living Water Reactive Canvas Background */}
      <LivingWaterBackground ntu={activeDisplay.raw.ntu} />

      {/* 2. Top Telemetry Readouts HUD */}
      <TelemetryReadouts
        telemetry={telemetry}
        isConnected={isConnected}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenReport={() => setIsReportOpen(true)}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        reducedMotion={reducedMotion}
        setReducedMotion={setReducedMotion}
      />

      {/* 3. Main Cockpit Center View */}
      <main className="relative z-10 flex-1 p-4 flex flex-col gap-4 max-w-[1720px] w-full mx-auto">
        {activeTab === 'cockpit' ? (
          <div className="flex flex-col gap-4">
            {/* Top Row: 3D Vehicle Kinematics View & Ghost Path Sonar Map */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[380px]">
              <AuvModel3D
                filter={activeDisplay.adaptiveFilter}
                homing={activeDisplay.homingStatus}
              />
              <GhostPathMap
                currentTelemetry={telemetry}
                history={history}
              />
            </div>

            {/* Middle Row: Trust Meter & Homing Compass */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <TrustMeter
                metrics={activeDisplay.trustMetrics}
                ntu={activeDisplay.raw.ntu}
              />
              <HomingCompass
                status={activeDisplay.homingStatus}
                heading={activeDisplay.adaptiveFilter.yaw}
              />
            </div>

            {/* Lower Row: Event Timeline & Scenario Controls */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <EventTimeline
                events={events}
                onSelectEvent={handleSelectEvent}
              />
              <ScenarioControls />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <SplitScreenFilterComparison
              currentTelemetry={telemetry}
              history={history}
            />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <GhostPathMap
                currentTelemetry={telemetry}
                history={history}
              />
              <ScenarioControls />
            </div>
          </div>
        )}
      </main>

      {/* 4. Bottom Scrubber Bar (Time-Travel Replay) */}
      <footer className="relative z-20 p-4 pt-1 max-w-[1720px] w-full mx-auto">
        <TimeTravelReplay
          isLive={isLive}
          setIsLive={setIsLive}
          history={history}
          currentIndex={currentIndex}
          onScrub={handleScrub}
          missions={missions}
          selectedMissionId={selectedMissionId || activeDisplay.raw.mission_id}
          onSelectMission={handleSelectMission}
        />
      </footer>

      {/* 5. One-Click Mission Report Modal (PDF Export) */}
      <MissionReportModal
        missionId={selectedMissionId || activeDisplay.raw.mission_id}
        isOpen={isReportOpen}
        onClose={() => setIsReportOpen(false)}
      />
    </div>
  );
};
