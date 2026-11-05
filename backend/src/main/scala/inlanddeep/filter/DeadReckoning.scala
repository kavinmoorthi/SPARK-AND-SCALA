package inlanddeep.filter

import inlanddeep.model.{DeadReckoningState, TelemetryRaw}

/**
 * Pure Dead Reckoning (DR) integration.
 * Uncorrected integration of body accelerometer and gyro readings.
 * Without Kalman filtering, small bias errors accumulate quadratically over time.
 */
class DeadReckoning {
  private var x: Double = 0.0
  private var y: Double = 0.0
  private var z: Double = 0.5
  private var vx: Double = 0.0
  private var vy: Double = 0.0
  private var vz: Double = 0.0
  private var heading: Double = 0.0
  private var lastTimestamp: Long = 0L

  def update(raw: TelemetryRaw): DeadReckoningState = {
    val dt = if (lastTimestamp == 0L) 0.2 else math.max(0.05, math.min(1.0, (raw.ts - lastTimestamp) / 1000.0))
    lastTimestamp = raw.ts

    // Gyro integration for heading (with uncorrected drift)
    heading = (heading + raw.gz * dt) % 360.0
    if (heading < 0.0) heading += 360.0

    val headingRad = math.toRadians(heading)
    val aWorldX = raw.ax * math.cos(headingRad) - raw.ay * math.sin(headingRad)
    val aWorldY = raw.ax * math.sin(headingRad) + raw.ay * math.cos(headingRad)
    val aWorldZ = raw.az - 9.81

    // Simple integration
    vx += aWorldX * dt
    vy += aWorldY * dt
    vz += aWorldZ * dt

    // Apply basic lake water damping so it doesn't fly to infinity immediately,
    // but still clearly diverges from true path
    vx *= 0.98
    vy *= 0.98

    x += vx * dt
    y += vy * dt
    z = math.max(0.0, z + vz * dt)

    DeadReckoningState(
      x = x,
      y = y,
      depth = z,
      vx = vx,
      vy = vy,
      heading = heading
    )
  }

  def reset(startX: Double = 0.0, startY: Double = 0.0, startDepth: Double = 0.5): Unit = {
    x = startX
    y = startY
    z = startDepth
    vx = 0.0
    vy = 0.0
    vz = 0.0
    heading = 0.0
    lastTimestamp = 0L
  }
}
