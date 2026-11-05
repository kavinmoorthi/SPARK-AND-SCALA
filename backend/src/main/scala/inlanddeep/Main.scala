package inlanddeep

import inlanddeep.model.FusedTelemetry
import inlanddeep.server.TelemetryRoutes
import inlanddeep.simulator.AuvSimulator
import inlanddeep.spark.SparkTelemetryProcessor
import inlanddeep.storage.Database
import org.apache.pekko.actor.ActorSystem
import org.apache.pekko.http.scaladsl.Http
import org.apache.pekko.stream.Materializer
import org.apache.pekko.stream.scaladsl.{BroadcastHub, Keep, Source}
import scala.concurrent.ExecutionContext
import scala.concurrent.duration._
import scala.util.{Failure, Success}

object Main {

  def main(args: Array[String]): Unit = {
    println(
      """
        |================================================================================
        |  INLAND DEEP CONSOLE - BACKEND ANALYTICS & TELEMETRY SUPERVISOR
        |  Autonomous Underwater Vehicle (AUV) Adaptive Fusion & Homing System
        |  Powered by Apache Spark 3.5 & Apache Pekko HTTP
        |================================================================================
        |""".stripMargin
    )

    implicit val system: ActorSystem = ActorSystem("InlandDeepSystem")
    implicit val mat: Materializer = Materializer(system)
    implicit val ec: ExecutionContext = system.dispatcher

    // 1. Initialize Storage & Database
    val database = new Database("data/inland_deep.db")
    database.init()
    println("[Storage] SQLite database initialized at data/inland_deep.db")

    // 2. Initialize Spark Telemetry Engine
    val sparkProcessor = new SparkTelemetryProcessor("data/parquet")
    println("[Spark] Apache Spark 3.5 Session initialized (Master: local[2])")

    // 3. Initialize Simulator
    val simulator = new AuvSimulator()
    println(s"[Simulator] AUV Simulator active. Mission ID: ${simulator.missionId}")

    // 4. Create 5 Hz (200ms) Telemetry Broadcast Stream
    var tickCount = 0L
    val (queue, liveSource) = Source.queue[FusedTelemetry](1024, org.apache.pekko.stream.OverflowStrategy.dropHead)
      .toMat(BroadcastHub.sink[FusedTelemetry](bufferSize = 256))(Keep.both)
      .run()

    // Simulator Tick Timer running at 200 ms (5 Hz)
    system.scheduler.scheduleAtFixedRate(0.milliseconds, 200.milliseconds) { () =>
      try {
        val fused = simulator.tick()
        queue.offer(fused)
        sparkProcessor.appendLiveReading(fused.raw)

        tickCount += 1
        // Persist to database once every 1 second (every 5 ticks) to avoid disk saturation
        if (tickCount % 5 == 0) {
          database.saveTelemetry(fused)
        }

        // Periodically update active mission summary in DB every 5 seconds
        if (tickCount % 25 == 0) {
          val report = sparkProcessor.generateMissionBatchReport(
            simulator.missionId,
            Seq(fused),
            fused.homingStatus.state,
            fused.homingStatus.triggerReason
          )
          database.insertMissionSummary(report)
        }
      } catch {
        case ex: Throwable =>
          System.err.println(s"[Simulator Error] ${ex.getMessage}")
      }
    }

    // 5. Pekko HTTP Server Setup
    val telemetryRoutes = new TelemetryRoutes(simulator, database, sparkProcessor, liveSource)
    val host = "0.0.0.0"
    val port = 8080

    val bindingFuture = Http().newServerAt(host, port).bind(telemetryRoutes.routes)

    bindingFuture.onComplete {
      case Success(binding) =>
        println(s"[HTTP] Inland Deep Console API listening on http://${binding.localAddress.getHostString}:$port")
        println(s"       - Live Telemetry WebSocket: ws://localhost:$port/live")
        println(s"       - Missions REST API:        http://localhost:$port/missions")
        println(s"       - Analytics Summary:        http://localhost:$port/analytics/summary")
        println(s"       - Emergency Homing:         POST http://localhost:$port/command/home")
        println(s"       - Scenario Injection:       POST http://localhost:$port/simulator/scenario")
        println(s"       - ESP32 Telemetry Ingest:   POST http://localhost:$port/telemetry")
        println("--------------------------------------------------------------------------------")
      case Failure(ex) =>
        System.err.println(s"[HTTP ERROR] Failed to bind server: ${ex.getMessage}")
        system.terminate()
    }

    sys.addShutdownHook {
      println("\n[Shutdown] Stopping Inland Deep Console...")
      sparkProcessor.stop()
      system.terminate()
    }
  }
}
