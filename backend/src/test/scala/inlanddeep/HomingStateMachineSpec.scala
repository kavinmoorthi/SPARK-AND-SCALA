package inlanddeep

import inlanddeep.homing.HomingStateMachine
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class HomingStateMachineSpec extends AnyFlatSpec with Matchers {

  "HomingStateMachine" should "start in NORMAL state" in {
    val fsm = new HomingStateMachine()
    val (status, evt) = fsm.update(10.0, 10.0, 5.0, 95.0, isLinkLost = false, manualCommandTriggered = false, "M1", System.currentTimeMillis(), 10.0)
    status.state shouldBe "NORMAL"
    status.isDocked shouldBe false
  }

  it should "transition to LOW_BATTERY and then HOMING when battery drops below 20%" in {
    val fsm = new HomingStateMachine()
    val now = System.currentTimeMillis()

    // Battery drops to 18.5%
    val (status1, evt1) = fsm.update(15.0, 20.0, 8.0, 18.5, isLinkLost = false, manualCommandTriggered = false, "M1", now, 12.0)
    status1.state shouldBe "LOW_BATTERY"
    status1.triggerReason should include("Critical power alert")
    evt1 shouldBe defined

    // Next tick escalates to HOMING
    val (status2, evt2) = fsm.update(15.0, 20.0, 8.0, 18.4, isLinkLost = false, manualCommandTriggered = false, "M1", now + 200, 12.0)
    status2.state shouldBe "HOMING"
    status2.triggerReason should include("low battery")
  }

  it should "transition to LINK_LOST and HOMING when telemetry link is lost" in {
    val fsm = new HomingStateMachine()
    val now = System.currentTimeMillis()

    val (status1, _) = fsm.update(25.0, 10.0, 12.0, 80.0, isLinkLost = true, manualCommandTriggered = false, "M1", now, 10.0)
    status1.state shouldBe "LINK_LOST"

    val (status2, _) = fsm.update(25.0, 10.0, 12.0, 80.0, isLinkLost = true, manualCommandTriggered = false, "M1", now + 200, 10.0)
    status2.state shouldBe "HOMING"
  }

  it should "transition to HOMING when manual operator command is triggered" in {
    val fsm = new HomingStateMachine()
    val now = System.currentTimeMillis()

    val (status, evt) = fsm.update(30.0, 40.0, 15.0, 75.0, isLinkLost = false, manualCommandTriggered = true, "M1", now, 25.0)
    status.state shouldBe "HOMING"
    status.triggerReason should include("Manual operator emergency")
    evt shouldBe defined
  }

  it should "transition to DOCKED when vehicle reaches beacon (< 1.2 meters)" in {
    val fsm = new HomingStateMachine(beaconX = 0.0, beaconY = 0.0, beaconDepth = 0.5)
    fsm.currentState = "HOMING"
    val now = System.currentTimeMillis()

    // Within 0.8 meters of beacon
    val (status, evt) = fsm.update(0.4, 0.4, 0.6, 60.0, isLinkLost = false, manualCommandTriggered = false, "M1", now, 10.0)
    status.state shouldBe "DOCKED"
    status.isDocked shouldBe true
    status.triggerReason should include("Docking latch engaged")
    evt shouldBe defined
    evt.get.severity shouldBe "SUCCESS"
  }
}
