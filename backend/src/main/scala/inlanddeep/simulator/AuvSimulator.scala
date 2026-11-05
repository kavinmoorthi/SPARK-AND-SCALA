package inlanddeep.simulator

import inlanddeep.filter.{DeadReckoning, KalmanFilter}
import inlanddeep.homing.HomingStateMachine
import inlanddeep.model._
import java.util.UUID
import scala.util.Random

class AuvSimulator(
  val missionId: String = "MISSION-" + UUID.randomUUID().toString.take(8).toUpperCase,
  val homingMachine: HomingStateMachine = new HomingStateMachine()
) {
  private val random = new Random(42)

  // Simulation physics state (Ground Truth)
  private var trueX: Double = 0.0
  private var trueY: Double = 0.0
  private var trueZ: Double = 0.5 // Depth in meters
  private var trueVx: Double = 0.0
  private var trueVy: Double = 0.0
  private var trueVz: Double = 0.0
  private var trueRoll: Double = 0.0
  private var truePitch: Double = 0.0
  private var trueHeading: Double = 45.0 // Degrees

  // Sensor drift states
  private var gyroBiasZ: Double = 0.02 // Deg/s drift
  private var gyroBiasX: Double = 0.01
  private var gyroBiasY: Double = 0.01

  // Battery
  private var battery: Double = 98.5

  // Simulation scenario injection variables
  private var injectedTurbiditySpike: Option[Double] = None
  private var spikeEndTime: Long = 0L
  private var imuDriftMultiplier: Double = 1.0
  private var isSignalLost: Boolean = false
  private var fastBatteryDrain: Boolean = false
  private var manualHomingTriggered: Boolean = false

  // Filters
  val fixedFilter = new KalmanFilter(isAdaptive = false)
  val adaptiveFilter = new KalmanFilter(isAdaptive = true)
  val deadReckon = new DeadReckoning()

  // Performance tracking
  private var sampleCount: Long = 0L
  private var sumSqErrorFixed: Double = 0.0
  private var sumSqErrorAdaptive: Double = 0.0

  // Survey waypoints (Lake survey pattern)
  private var waypointIndex = 0
  private val waypoints = Seq(
    (0.0, 0.0, 2.0),
    (20.0, 5.0, 6.0),
    (40.0, 8.0, 12.0),
    (45.0, 25.0, 16.0),
    (25.0, 28.0, 18.0),
    (5.0, 30.0, 14.0),
    (0.0, 50.0, 8.0),
    (30.0, 55.0, 15.0),
    (50.0, 60.0, 20.0)
  )

  def tick(currentTs: Long = System.currentTimeMillis()): FusedTelemetry = {
    sampleCount += 1
    val dt = 0.2 // 200 ms standard ESP32 telemetry interval

    // 1. Check Scenario Injections
    if (injectedTurbiditySpike.isDefined && currentTs > spikeEndTime) {
      injectedTurbiditySpike = None
    }

    // Battery Drain
    val drainRate = if (fastBatteryDrain) 1.2 else 0.035
    battery = math.max(0.0, battery - drainRate * dt)

    // 2. Navigation Dynamics: Survey Waypoint or Homing Transit
    val (targetX, targetY, targetZ) = if (homingMachine.currentState == "HOMING") {
      (homingMachine.beaconX, homingMachine.beaconY, homingMachine.beaconDepth)
    } else {
      waypoints(waypointIndex)
    }

    val dx = targetX - trueX
    val dy = targetY - trueY
    val dz = targetZ - trueZ
    val distToTarget = math.sqrt(dx * dx + dy * dy)

    if (distToTarget < 3.0 && homingMachine.currentState != "HOMING") {
      waypointIndex = (waypointIndex + 1) % waypoints.length
    }

    // Desired heading toward target
    val desiredHeading = (math.toDegrees(math.atan2(dy, dx)) + 360.0) % 360.0
    var headingError = desiredHeading - trueHeading
    while (headingError > 180.0) headingError -= 360.0
    while (headingError < -180.0) headingError += 360.0

    // Smooth yaw turning
    val maxTurnRate = 25.0 // deg/s
    val yawRate = math.max(-maxTurnRate, math.min(maxTurnRate, headingError * 1.5))
    trueHeading = (trueHeading + yawRate * dt + 360.0) % 360.0

    // Speed dynamics: ~0.8 m/s cruise speed
    val cruiseSpeed = if (homingMachine.currentState == "DOCKED") 0.0 else 0.85
    val targetVx = cruiseSpeed * math.cos(math.toRadians(trueHeading))
    val targetVy = cruiseSpeed * math.sin(math.toRadians(trueHeading))

    // Water currents (subtle cross-current in lake)
    val currentX = 0.06
    val currentY = -0.04

    trueVx += (targetVx + currentX - trueVx) * 0.4 * dt
    trueVy += (targetVy + currentY - trueVy) * 0.4 * dt

    // Depth dynamics (pitch angle tilts down when descending)
    val maxVerticalRate = 0.35 // m/s
    val depthError = targetZ - trueZ
    val targetVz = math.max(-maxVerticalRate, math.min(maxVerticalRate, depthError * 0.5))
    trueVz += (targetVz - trueVz) * 0.5 * dt

    truePitch = math.toDegrees(math.atan2(trueVz, cruiseSpeed)) * 0.8
    trueRoll = math.sin(sampleCount * 0.1) * 2.5 // slight buoyancy oscillation

    // Position integration for Ground Truth
    trueX += trueVx * dt
    trueY += trueVy * dt
    trueZ = math.max(0.1, trueZ + trueVz * dt)

    val groundTruth = GroundTruth(
      x = trueX,
      y = trueY,
      depth = trueZ,
      vx = trueVx,
      vy = trueVy,
      vz = trueVz,
      roll = trueRoll,
      pitch = truePitch,
      yaw = trueHeading
    )

    // 3. Environmental Turbidity (NTU)
    // Inland lake base turbidity increases with depth (silt thermocline at depth > 10m)
    val baseNtu = 9.0 + (if (trueZ > 10.0) (trueZ - 10.0) * 4.5 else (trueZ * 0.8)) + random.nextGaussian() * 0.8
    val liveNtu = math.max(2.0, injectedTurbiditySpike.getOrElse(baseNtu))

    // 4. MPU6050 & MS5837 Sensor Simulation with Realistic Noise
    // Gyro drift accumulates over time
    gyroBiasZ += (random.nextGaussian() * 0.005) * imuDriftMultiplier
    val measuredGz = yawRate + gyroBiasZ * imuDriftMultiplier + (random.nextGaussian() * 0.15)
    val measuredGx = (random.nextGaussian() * 0.2) + gyroBiasX
    val measuredGy = (random.nextGaussian() * 0.2) + gyroBiasY

    // Accelerometer readings (include gravity vector and body dynamics)
    val forwardAccel = (trueVx * math.cos(math.toRadians(trueHeading)) + trueVy * math.sin(math.toRadians(trueHeading))) / dt * 0.05
    val noiseScaleFactor = if (liveNtu >= 100.0) 3.5 else if (liveNtu >= 20.0) 1.8 else 1.0

    val measuredAx = forwardAccel + (random.nextGaussian() * 0.08 * noiseScaleFactor * imuDriftMultiplier)
    val measuredAy = (random.nextGaussian() * 0.08 * noiseScaleFactor * imuDriftMultiplier)
    val measuredAz = 9.81 + (random.nextGaussian() * 0.12 * noiseScaleFactor)

    // MS5837 Depth sensor reading: in murky sediment, pressure sensor sees particulate turbulence
    val depthNoise = (random.nextGaussian() * 0.04) * (if (liveNtu >= 100.0) 4.0 else 1.0)
    val measuredDepth = math.max(0.0, trueZ + depthNoise)

    val rawTelemetry = TelemetryRaw(
      mission_id = missionId,
      ts = currentTs,
      depth = (measuredDepth * 100.0).round / 100.0,
      ax = (measuredAx * 1000.0).round / 1000.0,
      ay = (measuredAy * 1000.0).round / 1000.0,
      az = (measuredAz * 1000.0).round / 1000.0,
      gx = (measuredGx * 100.0).round / 100.0,
      gy = (measuredGy * 100.0).round / 100.0,
      gz = (measuredGz * 100.0).round / 100.0,
      heading = ((trueHeading + (random.nextGaussian() * 1.5 * noiseScaleFactor) + 360.0) % 360.0 * 10.0).round / 10.0,
      ntu = (liveNtu * 10.0).round / 10.0,
      battery = (battery * 10.0).round / 10.0
    )

    // 5. Update State Machine
    val (homingStatus, _) = homingMachine.update(
      x = trueX,
      y = trueY,
      depth = trueZ,
      battery = battery,
      isLinkLost = isSignalLost,
      manualCommandTriggered = manualHomingTriggered,
      missionId = missionId,
      ts = currentTs,
      ntu = liveNtu
    )
    manualHomingTriggered = false // consumed

    // 6. Update Filters Side-by-Side
    val estFixed = fixedFilter.update(rawTelemetry)
    val estAdaptive = adaptiveFilter.update(rawTelemetry)
    val estDr = deadReckon.update(rawTelemetry)

    // 7. Calculate Error Metrics & RMSE against Ground Truth
    val errFixed = math.sqrt(
      math.pow(estFixed.x - trueX, 2) +
      math.pow(estFixed.y - trueY, 2) +
      math.pow(estFixed.depth - trueZ, 2)
    )
    val errAdaptive = math.sqrt(
      math.pow(estAdaptive.x - trueX, 2) +
      math.pow(estAdaptive.y - trueY, 2) +
      math.pow(estAdaptive.depth - trueZ, 2)
    )

    sumSqErrorFixed += errFixed * errFixed
    sumSqErrorAdaptive += errAdaptive * errAdaptive

    val rmseFixed = math.sqrt(sumSqErrorFixed / sampleCount)
    val rmseAdaptive = math.sqrt(sumSqErrorAdaptive / sampleCount)

    val improvementPct = if (rmseFixed > 0.001) {
      math.max(0.0, ((rmseFixed - rmseAdaptive) / rmseFixed) * 100.0)
    } else 0.0

    // Dynamic Drift Error Halo radius
    val driftHaloRadius = math.max(0.5, estAdaptive.uncertaintyTrace * 0.4)

    // Trust meter values
    val noiseScale = adaptiveFilter.computeNoiseScale(liveNtu)
    val imuTrust = math.max(0.1, 1.0 - (noiseScale - 1.0) * 0.18)
    val depthTrust = math.max(0.15, 1.0 / noiseScale)
    val filterConfidence = math.max(20.0, 100.0 - (noiseScale - 1.0) * 18.0)

    val trustMetrics = TrustMetrics(
      imuTrust = (imuTrust * 100.0).round / 100.0,
      depthTrust = (depthTrust * 100.0).round / 100.0,
      turbidityScale = noiseScale,
      filterConfidence = (filterConfidence * 10.0).round / 10.0
    )

    FusedTelemetry(
      raw = rawTelemetry,
      groundTruth = groundTruth,
      fixedFilter = estFixed,
      adaptiveFilter = estAdaptive,
      deadReckoning = estDr,
      trustMetrics = trustMetrics,
      homingStatus = homingStatus,
      rmseFixed = (rmseFixed * 1000.0).round / 1000.0,
      rmseAdaptive = (rmseAdaptive * 1000.0).round / 1000.0,
      improvementPct = (improvementPct * 10.0).round / 10.0,
      driftHaloRadius = (driftHaloRadius * 100.0).round / 100.0
    )
  }

  // Scenario Injection methods for live demo
  def injectTurbiditySpike(ntu: Double, durationSec: Int): Unit = {
    injectedTurbiditySpike = Some(ntu)
    spikeEndTime = System.currentTimeMillis() + (durationSec * 1000L)
  }

  def setImuDrift(factor: Double): Unit = {
    imuDriftMultiplier = factor
  }

  def setSignalLoss(loss: Boolean): Unit = {
    isSignalLost = loss
  }

  def setFastBatteryDrain(drain: Boolean): Unit = {
    fastBatteryDrain = drain
  }

  def triggerHomeCommand(): Unit = {
    manualHomingTriggered = true
    homingMachine.triggerManualHome()
  }

  def reset(): Unit = {
    trueX = 0.0
    trueY = 0.0
    trueZ = 0.5
    trueVx = 0.0
    trueVy = 0.0
    trueVz = 0.0
    trueHeading = 45.0
    battery = 98.5
    sampleCount = 0L
    sumSqErrorFixed = 0.0
    sumSqErrorAdaptive = 0.0
    injectedTurbiditySpike = None
    imuDriftMultiplier = 1.0
    isSignalLost = false
    fastBatteryDrain = false
    manualHomingTriggered = false
    waypointIndex = 0

    fixedFilter.reset(0.0, 0.0, 0.5)
    adaptiveFilter.reset(0.0, 0.0, 0.5)
    deadReckon.reset(0.0, 0.0, 0.5)
    homingMachine.reset()
  }
}
