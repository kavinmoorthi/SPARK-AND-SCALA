package inlanddeep.homing

import inlanddeep.model.{HomingStatus, MissionEvent}

/**
 * Homing State Machine for Autonomous Underwater Systems.
 * States:
 *   - NORMAL: Standard mission survey mode.
 *   - LOW_BATTERY: Battery level critically low (< 20%). Triggers immediate homing transition.
 *   - LINK_LOST: Telemetry link timeout or signal loss. Triggers homing fail-safe.
 *   - HOMING: Autonomous transit vectoring toward surface dock/beacon at (0.0, 0.0, 0.5).
 *   - DOCKED: Vehicle arrived at beacon (< 1.2 meters), homing successful.
 */
class HomingStateMachine(
  val beaconX: Double = 0.0,
  val beaconY: Double = 0.0,
  val beaconDepth: Double = 0.5,
  val lowBatteryThreshold: Double = 20.0,
  val dockingDistanceThreshold: Double = 1.2
) {
  var currentState: String = "NORMAL"
  var triggerReason: String = "Normal mission survey execution"
  var lastEvent: Option[MissionEvent] = None
  private var eventCounter: Long = 0L

  def update(
    x: Double,
    y: Double,
    depth: Double,
    battery: Double,
    isLinkLost: Boolean,
    manualCommandTriggered: Boolean,
    missionId: String,
    ts: Long,
    ntu: Double
  ): (HomingStatus, Option[MissionEvent]) = {
    val dx = beaconX - x
    val dy = beaconY - y
    val dz = beaconDepth - depth
    val distanceToBeacon = math.sqrt(dx * dx + dy * dy + dz * dz)

    // Calculate bearing in degrees from current position to beacon [0, 360)
    var bearingDeg = math.toDegrees(math.atan2(dy, dx))
    if (bearingDeg < 0.0) bearingDeg += 360.0

    var stateChanged = false
    var previousState = currentState

    // State Transition Logic
    if (currentState == "DOCKED") {
      // Stay docked until mission reset
    } else if (currentState == "HOMING") {
      if (distanceToBeacon <= dockingDistanceThreshold) {
        currentState = "DOCKED"
        triggerReason = s"Beacon lock achieved! Distance ${f"$distanceToBeacon%1.2f"}m <= ${dockingDistanceThreshold}m. Docking latch engaged."
        stateChanged = true
      }
    } else {
      // States: NORMAL, LOW_BATTERY, LINK_LOST
      if (manualCommandTriggered) {
        currentState = "HOMING"
        triggerReason = "Manual operator emergency return-home command issued"
        stateChanged = true
      } else if (battery <= lowBatteryThreshold) {
        if (currentState != "LOW_BATTERY") {
          currentState = "LOW_BATTERY"
          triggerReason = s"Critical power alert: Battery at ${f"$battery%1.1f"}% <= threshold ${lowBatteryThreshold}%"
          stateChanged = true
        } else {
          // Immediately escalate LOW_BATTERY to HOMING
          currentState = "HOMING"
          triggerReason = s"Automatic fail-safe homing initiated due to low battery (${f"$battery%1.1f"}%)"
          stateChanged = true
        }
      } else if (isLinkLost) {
        if (currentState != "LINK_LOST") {
          currentState = "LINK_LOST"
          triggerReason = "Telemetry communication link lost. Commencing dead-reckon homing sequence"
          stateChanged = true
        } else {
          currentState = "HOMING"
          triggerReason = "Signal loss timeout exceeded. Return-to-home transit engaged"
          stateChanged = true
        }
      }
    }

    val eventOpt = if (stateChanged) {
      eventCounter += 1
      val severity = currentState match {
        case "DOCKED" => "SUCCESS"
        case "HOMING" => "WARNING"
        case "LOW_BATTERY" => "CRITICAL"
        case "LINK_LOST" => "CRITICAL"
        case _ => "INFO"
      }
      val evt = MissionEvent(
        id = eventCounter,
        missionId = missionId,
        ts = ts,
        eventType = currentState,
        severity = severity,
        description = triggerReason,
        ntu = ntu,
        depth = depth
      )
      lastEvent = Some(evt)
      Some(evt)
    } else {
      None
    }

    val status = HomingStatus(
      state = currentState,
      triggerReason = triggerReason,
      beaconDistance = distanceToBeacon,
      beaconBearing = bearingDeg,
      isDocked = currentState == "DOCKED",
      batteryRemaining = battery
    )

    (status, eventOpt)
  }

  def triggerManualHome(): Unit = {
    if (currentState != "DOCKED") {
      currentState = "HOMING"
      triggerReason = "Operator manual home return override"
    }
  }

  def reset(): Unit = {
    currentState = "NORMAL"
    triggerReason = "Normal mission survey execution"
    lastEvent = None
  }
}
