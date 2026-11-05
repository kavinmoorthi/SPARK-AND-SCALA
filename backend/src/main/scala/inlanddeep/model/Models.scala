package inlanddeep.model

import io.circe._
import io.circe.generic.semiauto._

/**
 * Raw telemetry frame matching the ESP32 hardware packet specification:
 * {"mission_id","ts","depth","ax","ay","az","gx","gy","gz","heading","ntu","battery"}
 */
case class TelemetryRaw(
  mission_id: String,
  ts: Long,
  depth: Double,
  ax: Double,
  ay: Double,
  az: Double,
  gx: Double,
  gy: Double,
  gz: Double,
  heading: Double,
  ntu: Double,
  battery: Double
)

object TelemetryRaw {
  implicit val encoder: Encoder[TelemetryRaw] = deriveEncoder[TelemetryRaw]
  implicit val decoder: Decoder[TelemetryRaw] = deriveDecoder[TelemetryRaw]
}

/**
 * Ground truth from physics simulator to evaluate Kalman filter performance.
 */
case class GroundTruth(
  x: Double,
  y: Double,
  depth: Double,
  vx: Double,
  vy: Double,
  vz: Double,
  roll: Double,
  pitch: Double,
  yaw: Double
)

object GroundTruth {
  implicit val encoder: Encoder[GroundTruth] = deriveEncoder[GroundTruth]
  implicit val decoder: Decoder[GroundTruth] = deriveDecoder[GroundTruth]
}

/**
 * Filter state estimate output (Position, Velocity, Orientation, Uncertainty).
 */
case class FilterState(
  x: Double,
  y: Double,
  depth: Double,
  vx: Double,
  vy: Double,
  vz: Double,
  roll: Double,
  pitch: Double,
  yaw: Double,
  uncertaintyTrace: Double,
  noiseScale: Double
)

object FilterState {
  implicit val encoder: Encoder[FilterState] = deriveEncoder[FilterState]
  implicit val decoder: Decoder[FilterState] = deriveDecoder[FilterState]
}

/**
 * Uncorrected raw dead reckoning integration (suffers continuous sensor bias drift).
 */
case class DeadReckoningState(
  x: Double,
  y: Double,
  depth: Double,
  vx: Double,
  vy: Double,
  heading: Double
)

object DeadReckoningState {
  implicit val encoder: Encoder[DeadReckoningState] = deriveEncoder[DeadReckoningState]
  implicit val decoder: Decoder[DeadReckoningState] = deriveDecoder[DeadReckoningState]
}

/**
 * Trust metrics indicating the filter's dynamic weighting of raw sensors vs prediction model.
 */
case class TrustMetrics(
  imuTrust: Double,         // 0.0 to 1.0 (confidence in IMU)
  depthTrust: Double,       // 0.0 to 1.0 (confidence in MS5837 pressure sensor)
  turbidityScale: Double,   // 1.0, 2.5, or 5.0
  filterConfidence: Double  // Overall confidence %
)

object TrustMetrics {
  implicit val encoder: Encoder[TrustMetrics] = deriveEncoder[TrustMetrics]
  implicit val decoder: Decoder[TrustMetrics] = deriveDecoder[TrustMetrics]
}

/**
 * Homing state and guidance telemetry.
 */
case class HomingStatus(
  state: String,            // "NORMAL", "LOW_BATTERY", "LINK_LOST", "HOMING", "DOCKED"
  triggerReason: String,
  beaconDistance: Double,   // meters to dock beacon
  beaconBearing: Double,    // degrees heading toward beacon
  isDocked: Boolean,
  batteryRemaining: Double
)

object HomingStatus {
  implicit val encoder: Encoder[HomingStatus] = deriveEncoder[HomingStatus]
  implicit val decoder: Decoder[HomingStatus] = deriveDecoder[HomingStatus]
}

/**
 * Unified live telemetry message pushed via WebSocket and recorded to SQLite/Parquet.
 */
case class FusedTelemetry(
  raw: TelemetryRaw,
  groundTruth: GroundTruth,
  fixedFilter: FilterState,
  adaptiveFilter: FilterState,
  deadReckoning: DeadReckoningState,
  trustMetrics: TrustMetrics,
  homingStatus: HomingStatus,
  rmseFixed: Double,
  rmseAdaptive: Double,
  improvementPct: Double,
  driftHaloRadius: Double
)

object FusedTelemetry {
  implicit val encoder: Encoder[FusedTelemetry] = deriveEncoder[FusedTelemetry]
  implicit val decoder: Decoder[FusedTelemetry] = deriveDecoder[FusedTelemetry]
}

/**
 * Spark Structured Streaming 10-second micro-window metrics.
 */
case class WindowMetrics(
  windowStart: Long,
  windowEnd: Long,
  avgTurbidity: Double,
  depthStdDev: Double,
  minBattery: Double,
  sampleCount: Long
)

object WindowMetrics {
  implicit val encoder: Encoder[WindowMetrics] = deriveEncoder[WindowMetrics]
  implicit val decoder: Decoder[WindowMetrics] = deriveDecoder[WindowMetrics]
}

/**
 * Event log record for mission timeline.
 */
case class MissionEvent(
  id: Long,
  missionId: String,
  ts: Long,
  eventType: String, // "NORMAL", "TURBIDITY_SPIKE", "LOW_BATTERY", "LINK_LOST", "HOMING_TRIGGERED", "DOCKED"
  severity: String,  // "INFO", "WARNING", "CRITICAL", "SUCCESS"
  description: String,
  ntu: Double,
  depth: Double
)

object MissionEvent {
  implicit val encoder: Encoder[MissionEvent] = deriveEncoder[MissionEvent]
  implicit val decoder: Decoder[MissionEvent] = deriveDecoder[MissionEvent]
}

/**
 * Summary record produced by Spark SQL batch processing.
 */
case class MissionSummary(
  missionId: String,
  startTime: Long,
  endTime: Long,
  durationSec: Double,
  avgTurbidity: Double,
  maxDepth: Double,
  minBattery: Double,
  totalSamples: Long,
  rmseFixed: Double,
  rmseAdaptive: Double,
  improvementPct: Double,
  homingState: String,
  homingTrigger: String,
  homingSuccess: Boolean
)

object MissionSummary {
  implicit val encoder: Encoder[MissionSummary] = deriveEncoder[MissionSummary]
  implicit val decoder: Decoder[MissionSummary] = deriveDecoder[MissionSummary]
}

/**
 * Simulator scenario injection payload.
 */
case class ScenarioRequest(
  turbiditySpike: Option[Double] = None,   // target NTU, e.g. 180.0
  spikeDurationSec: Option[Int] = None,    // duration in seconds
  imuDriftFactor: Option[Double] = None,   // drift multiplier
  signalLoss: Option[Boolean] = None,      // simulate comms dropout
  drainBatteryFast: Option[Boolean] = None,// simulate low battery
  resetMission: Option[Boolean] = None
)

object ScenarioRequest {
  implicit val encoder: Encoder[ScenarioRequest] = deriveEncoder[ScenarioRequest]
  implicit val decoder: Decoder[ScenarioRequest] = deriveDecoder[ScenarioRequest]
}

/**
 * System analytics overall summary.
 */
case class AnalyticsOverview(
  totalMissions: Int,
  totalDistanceMeters: Double,
  avgTurbidityOverall: Double,
  overallImprovementPct: Double,
  homingSuccessRatePct: Double,
  recentMissions: Seq[MissionSummary]
)

object AnalyticsOverview {
  implicit val encoder: Encoder[AnalyticsOverview] = deriveEncoder[AnalyticsOverview]
  implicit val decoder: Decoder[AnalyticsOverview] = deriveDecoder[AnalyticsOverview]
}
