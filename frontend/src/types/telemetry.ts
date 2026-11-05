export interface TelemetryRaw {
  mission_id: string;
  ts: number;
  depth: number;
  ax: number;
  ay: number;
  az: number;
  gx: number;
  gy: number;
  gz: number;
  heading: number;
  ntu: number;
  battery: number;
}

export interface GroundTruth {
  x: number;
  y: number;
  depth: number;
  vx: number;
  vy: number;
  vz: number;
  roll: number;
  pitch: number;
  yaw: number;
}

export interface FilterState {
  x: number;
  y: number;
  depth: number;
  vx: number;
  vy: number;
  vz: number;
  roll: number;
  pitch: number;
  yaw: number;
  uncertaintyTrace: number;
  noiseScale: number;
}

export interface DeadReckoningState {
  x: number;
  y: number;
  depth: number;
  vx: number;
  vy: number;
  heading: number;
}

export interface TrustMetrics {
  imuTrust: number;
  depthTrust: number;
  turbidityScale: number;
  filterConfidence: number;
}

export interface HomingStatus {
  state: 'NORMAL' | 'LOW_BATTERY' | 'LINK_LOST' | 'HOMING' | 'DOCKED';
  triggerReason: string;
  beaconDistance: number;
  beaconBearing: number;
  isDocked: boolean;
  batteryRemaining: number;
}

export interface FusedTelemetry {
  raw: TelemetryRaw;
  groundTruth: GroundTruth;
  fixedFilter: FilterState;
  adaptiveFilter: FilterState;
  deadReckoning: DeadReckoningState;
  trustMetrics: TrustMetrics;
  homingStatus: HomingStatus;
  rmseFixed: number;
  rmseAdaptive: number;
  improvementPct: number;
  driftHaloRadius: number;
}

export interface MissionEvent {
  id: number;
  missionId: string;
  ts: number;
  eventType: 'NORMAL' | 'TURBIDITY_SPIKE' | 'LOW_BATTERY' | 'LINK_LOST' | 'HOMING' | 'DOCKED';
  severity: 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS';
  description: string;
  ntu: number;
  depth: number;
}

export interface MissionSummary {
  missionId: string;
  startTime: number;
  endTime: number;
  durationSec: number;
  avgTurbidity: number;
  maxDepth: number;
  minBattery: number;
  totalSamples: number;
  rmseFixed: number;
  rmseAdaptive: number;
  improvementPct: number;
  homingState: string;
  homingTrigger: string;
  homingSuccess: boolean;
}

export interface WindowMetrics {
  windowStart: number;
  windowEnd: number;
  avgTurbidity: number;
  depthStdDev: number;
  minBattery: number;
  sampleCount: number;
}

export interface AnalyticsOverview {
  totalMissions: number;
  totalDistanceMeters: number;
  avgTurbidityOverall: number;
  overallImprovementPct: number;
  homingSuccessRatePct: number;
  recentMissions: MissionSummary[];
}

export interface ScenarioRequest {
  turbiditySpike?: number;
  spikeDurationSec?: number;
  imuDriftFactor?: number;
  signalLoss?: boolean;
  drainBatteryFast?: boolean;
  resetMission?: boolean;
}
