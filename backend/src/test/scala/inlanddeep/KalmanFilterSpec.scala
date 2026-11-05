package inlanddeep

import inlanddeep.filter.KalmanFilter
import inlanddeep.model.TelemetryRaw
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class KalmanFilterSpec extends AnyFlatSpec with Matchers {

  "AdaptiveKalmanFilter" should "correctly apply turbidity noise scaling according to NTU thresholds" in {
    val adaptive = new KalmanFilter(isAdaptive = true)

    adaptive.computeNoiseScale(5.0) shouldBe 1.0
    adaptive.computeNoiseScale(19.9) shouldBe 1.0
    adaptive.computeNoiseScale(20.0) shouldBe 2.5
    adaptive.computeNoiseScale(55.0) shouldBe 2.5
    adaptive.computeNoiseScale(99.9) shouldBe 2.5
    adaptive.computeNoiseScale(100.0) shouldBe 5.0
    adaptive.computeNoiseScale(220.0) shouldBe 5.0
  }

  "FixedKalmanFilter" should "maintain a constant noise scale of 1.0 regardless of turbidity" in {
    val fixed = new KalmanFilter(isAdaptive = false)

    fixed.computeNoiseScale(5.0) shouldBe 1.0
    fixed.computeNoiseScale(50.0) shouldBe 1.0
    fixed.computeNoiseScale(150.0) shouldBe 1.0
  }

  "KalmanFilter" should "smooth depth readings and converge toward measurement" in {
    val filter = new KalmanFilter(isAdaptive = true)
    val now = System.currentTimeMillis()

    val raw1 = TelemetryRaw("TEST-01", now, depth = 5.0, 0, 0, 9.81, 0, 0, 0, 90.0, 12.0, 95.0)
    val s1 = filter.update(raw1)
    s1.depth should be > 0.5
    s1.depth should be < 5.0

    val raw2 = TelemetryRaw("TEST-01", now + 200, depth = 5.0, 0, 0, 9.81, 0, 0, 0, 90.0, 12.0, 95.0)
    val s2 = filter.update(raw2)
    s2.depth should be > s1.depth
  }

  "AdaptiveKalmanFilter" should "reject abrupt sensor spikes more aggressively under high turbidity than fixed filter" in {
    val fixed = new KalmanFilter(isAdaptive = false)
    val adaptive = new KalmanFilter(isAdaptive = true)
    val now = System.currentTimeMillis()

    // Settle both at 10.0m depth
    for (i <- 1 to 10) {
      val r = TelemetryRaw("TEST-SPIKE", now + i * 200, depth = 10.0, 0, 0, 9.81, 0, 0, 0, 0.0, 15.0, 90.0)
      fixed.update(r)
      adaptive.update(r)
    }

    // Now inject a noisy sensor spike (reading 15.0m instead of 10.0m) under heavy turbidity (160 NTU)
    val spikeRaw = TelemetryRaw("TEST-SPIKE", now + 2200, depth = 15.0, 0, 0, 9.81, 0, 0, 0, 0.0, 160.0, 89.0)
    val fixedOut = fixed.update(spikeRaw)
    val adaptiveOut = adaptive.update(spikeRaw)

    // The fixed filter will be pulled strongly toward 15.0m
    // The adaptive filter, having scaled R by 5.0, will trust the spike much less!
    val fixedDrift = math.abs(fixedOut.depth - 10.0)
    val adaptiveDrift = math.abs(adaptiveOut.depth - 10.0)

    adaptiveDrift should be < fixedDrift
  }
}
