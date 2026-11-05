package inlanddeep.filter

import inlanddeep.model.{FilterState, TelemetryRaw}

/**
 * 3D Kinematic Kalman Filter for AUV Navigation.
 *
 * State Vector:
 *   x = [pos_x, pos_y, depth, vel_x, vel_y, vel_z, roll, pitch, yaw]^T
 *
 * Kinematics:
 *   pos_{k} = pos_{k-1} + vel_{k-1} * dt + 0.5 * accel_{world} * dt^2
 *   vel_{k} = vel_{k-1} * (1 - drag * dt) + accel_{world} * dt
 *   depth is directly observed by MS5837 pressure sensor.
 *   yaw (heading) is observed by compass / integrated gyro.
 */
class KalmanFilter(
  val isAdaptive: Boolean,
  val baseRDepth: Double = 0.05,
  val baseRVel: Double = 0.30,
  val baseRHeading: Double = 0.08
) {
  // State: [x, y, z, vx, vy, vz, roll, pitch, yaw]
  private var x: Double = 0.0
  private var y: Double = 0.0
  private var z: Double = 0.5 // Start near surface
  private var vx: Double = 0.0
  private var vy: Double = 0.0
  private var vz: Double = 0.0
  private var roll: Double = 0.0
  private var pitch: Double = 0.0
  private var yaw: Double = 0.0

  // State estimation covariance (diagonal terms for stability)
  private var P_pos_xy: Double = 1.0
  private var P_depth: Double = 0.2
  private var P_vel_xy: Double = 0.5
  private var P_vel_z: Double = 0.2
  private var P_heading: Double = 0.1

  // Process noise Q
  private val Q_pos = 0.02
  private val Q_depth = 0.01
  private val Q_vel = 0.08
  private val Q_heading = 0.03

  // Hydrodynamic drag damping coefficient
  private val dragCoeff = 0.12

  private var lastTimestamp: Long = 0L

  /**
   * Adaptive noise calculation according to thesis requirement:
   * noise_scale = 1.0 if NTU < 20
   * noise_scale = 2.5 if 20 <= NTU < 100
   * noise_scale = 5.0 if NTU >= 100
   */
  def computeNoiseScale(ntu: Double): Double = {
    if (!isAdaptive) {
      1.0
    } else {
      if (ntu < 20.0) 1.0
      else if (ntu < 100.0) 2.5
      else 5.0
    }
  }

  def update(raw: TelemetryRaw): FilterState = {
    val dt = if (lastTimestamp == 0L) 0.2 else math.max(0.05, math.min(1.0, (raw.ts - lastTimestamp) / 1000.0))
    lastTimestamp = raw.ts

    val noiseScale = computeNoiseScale(raw.ntu)

    // 1. Orientation Update (from gyro rates + accelerometer gravity vector)
    val gyroScale = math.Pi / 180.0
    val rollRate = raw.gx * gyroScale
    val pitchRate = raw.gy * gyroScale
    val yawRate = raw.gz * gyroScale

    // Simple complementary angle calculation from accelerometer for roll & pitch
    val accelRoll = math.atan2(raw.ay, math.sqrt(raw.ax * raw.ax + raw.az * raw.az))
    val accelPitch = math.atan2(-raw.ax, math.sqrt(raw.ay * raw.ay + raw.az * raw.az))

    val compAlpha = 0.95
    roll = compAlpha * (roll + rollRate * dt) + (1.0 - compAlpha) * accelRoll
    pitch = compAlpha * (pitch + pitchRate * dt) + (1.0 - compAlpha) * accelPitch

    // Heading measurement in radians
    val measuredHeadingRad = math.toRadians(raw.heading)

    // Heading Kalman update
    P_heading = P_heading + Q_heading * dt
    val R_heading = baseRHeading * noiseScale
    val K_heading = P_heading / (P_heading + R_heading)
    // Wrap heading error to [-pi, pi]
    val headingDiff = Math.atan2(Math.sin(measuredHeadingRad - yaw), Math.cos(measuredHeadingRad - yaw))
    yaw = yaw + K_heading * headingDiff
    P_heading = (1.0 - K_heading) * P_heading

    // 2. Transform Body Accelerations into World Frame
    // Body ax is surge (forward), ay is sway (starboard), az is heave (vertical)
    val cosY = math.cos(yaw)
    val sinY = math.sin(yaw)
    val cosP = math.cos(pitch)
    val sinP = math.sin(pitch)

    val aWorldX = raw.ax * cosY * cosP - raw.ay * sinY
    val aWorldY = raw.ax * sinY * cosP + raw.ay * cosY
    val aWorldZ = raw.az - 9.81 // Remove gravity

    // 3. State Prediction (Dead-reckoning step)
    // Apply hydrodynamic damping (water resistance opposes motion)
    vx = vx * (1.0 - dragCoeff * dt) + aWorldX * dt
    vy = vy * (1.0 - dragCoeff * dt) + aWorldY * dt
    vz = vz * (1.0 - dragCoeff * dt) + aWorldZ * dt

    x = x + vx * dt + 0.5 * aWorldX * dt * dt
    y = y + vy * dt + 0.5 * aWorldY * dt * dt
    val predictedDepth = z + vz * dt

    // Propagate covariance
    P_pos_xy = P_pos_xy + P_vel_xy * dt + Q_pos * dt
    P_vel_xy = P_vel_xy + Q_vel * dt
    P_depth = P_depth + P_vel_z * dt + Q_depth * dt
    P_vel_z = P_vel_z + Q_vel * dt

    // 4. Measurement Update for Depth (from MS5837 pressure sensor)
    val measuredDepth = math.max(0.0, raw.depth)
    val R_depth = baseRDepth * noiseScale
    val K_depth = P_depth / (P_depth + R_depth)

    // In high turbidity, if raw depth has high noise or anomaly, adaptive filter suppresses it
    val depthInnovation = measuredDepth - predictedDepth
    z = predictedDepth + K_depth * depthInnovation
    P_depth = (1.0 - K_depth) * P_depth

    // Velocity update from depth rate of change
    val measuredVz = (measuredDepth - z) / dt
    val K_vz = P_vel_z / (P_vel_z + baseRVel * noiseScale)
    vz = vz + K_vz * (measuredVz - vz)
    P_vel_z = (1.0 - K_vz) * P_vel_z

    // In horizontal plane: when noiseScale is high, position uncertainty expands
    val uncertaintyTrace = P_pos_xy * 2.0 + P_depth + P_vel_xy * 2.0 + P_vel_z

    FilterState(
      x = x,
      y = y,
      depth = z,
      vx = vx,
      vy = vy,
      vz = vz,
      roll = math.toDegrees(roll),
      pitch = math.toDegrees(pitch),
      yaw = (math.toDegrees(yaw) % 360.0 + 360.0) % 360.0,
      uncertaintyTrace = uncertaintyTrace,
      noiseScale = noiseScale
    )
  }

  def reset(startX: Double = 0.0, startY: Double = 0.0, startDepth: Double = 0.5): Unit = {
    x = startX
    y = startY
    z = startDepth
    vx = 0.0
    vy = 0.0
    vz = 0.0
    roll = 0.0
    pitch = 0.0
    yaw = 0.0
    P_pos_xy = 1.0
    P_depth = 0.2
    P_vel_xy = 0.5
    P_vel_z = 0.2
    P_heading = 0.1
    lastTimestamp = 0L
  }
}
