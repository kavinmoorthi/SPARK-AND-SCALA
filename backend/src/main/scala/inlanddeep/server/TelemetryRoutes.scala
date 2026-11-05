package inlanddeep.server

import inlanddeep.model._
import inlanddeep.simulator.AuvSimulator
import inlanddeep.spark.SparkTelemetryProcessor
import inlanddeep.storage.Database
import io.circe.parser._
import io.circe.syntax._
import org.apache.pekko.http.cors.scaladsl.CorsDirectives._
import org.apache.pekko.http.scaladsl.model._
import org.apache.pekko.http.scaladsl.model.ws.{Message, TextMessage}
import org.apache.pekko.http.scaladsl.server.Directives._
import org.apache.pekko.http.scaladsl.server.Route
import org.apache.pekko.stream.Materializer
import org.apache.pekko.stream.scaladsl.{Flow, Sink, Source}
import scala.concurrent.duration._

class TelemetryRoutes(
  val simulator: AuvSimulator,
  val database: Database,
  val sparkProcessor: SparkTelemetryProcessor,
  val liveSource: Source[FusedTelemetry, _]
)(implicit val mat: Materializer) {

  // Flow for WebSocket client connections
  def liveWebSocketFlow: Flow[Message, Message, Any] = {
    // Sink simply ignores incoming client pings or heartbeats
    val incomingSink = Sink.ignore

    // Outgoing source maps live FusedTelemetry to TextMessage
    val outgoingSource = liveSource
      .map(fused => TextMessage.Strict(fused.asJson.noSpaces))
      .keepAlive(15.seconds, () => TextMessage.Strict("""{"type":"ping"}"""))

    Flow.fromSinkAndSource(incomingSink, outgoingSource)
  }

  val routes: Route = cors() {
    concat(
      // WebSocket live stream
      path("live") {
        handleWebSocketMessages(liveWebSocketFlow)
      },

      // Mission management endpoints
      path("missions") {
        get {
          val missions = database.getMissions
          complete(HttpEntity(ContentTypes.`application/json`, missions.asJson.noSpaces))
        }
      },

      path("missions" / Segment / "telemetry") { missionId =>
        get {
          parameters("limit".as[Int].optional) { limitOpt =>
            val limit = limitOpt.getOrElse(1500)
            val telemetry = database.getMissionTelemetry(missionId, limit)
            complete(HttpEntity(ContentTypes.`application/json`, telemetry.asJson.noSpaces))
          }
        }
      },

      path("missions" / Segment / "events") { missionId =>
        get {
          val events = database.getMissionEvents(missionId)
          complete(HttpEntity(ContentTypes.`application/json`, events.asJson.noSpaces))
        }
      },

      path("missions" / Segment / "report") { missionId =>
        get {
          val telemetry = database.getMissionTelemetry(missionId, 3000)
          val lastSample = telemetry.lastOption
          val homingState = lastSample.map(_.homingStatus.state).getOrElse("NORMAL")
          val homingTrigger = lastSample.map(_.homingStatus.triggerReason).getOrElse("N/A")
          val report = sparkProcessor.generateMissionBatchReport(missionId, telemetry, homingState, homingTrigger)
          database.insertMissionSummary(report)
          complete(HttpEntity(ContentTypes.`application/json`, report.asJson.noSpaces))
        }
      },

      // Analytics endpoints
      path("analytics" / "summary") {
        get {
          val summary = database.getAnalyticsOverview
          complete(HttpEntity(ContentTypes.`application/json`, summary.asJson.noSpaces))
        }
      },

      path("analytics" / "windows") {
        get {
          val windows = sparkProcessor.compute10SecWindows()
          complete(HttpEntity(ContentTypes.`application/json`, windows.asJson.noSpaces))
        }
      },

      // Command & Control: Homing Trigger
      path("command" / "home") {
        post {
          simulator.triggerHomeCommand()
          val response = Map(
            "status" -> "HOMING_COMMAND_ACCEPTED",
            "message" -> "Operator emergency return-home instruction dispatched to AUV telemetry supervisor."
          )
          complete(HttpEntity(ContentTypes.`application/json`, response.asJson.noSpaces))
        }
      },

      // Scenario injection for live defense demonstration
      path("simulator" / "scenario") {
        post {
          entity(as[String]) { jsonStr =>
            decode[ScenarioRequest](jsonStr) match {
              case Right(req) =>
                req.turbiditySpike.foreach { ntu =>
                  simulator.injectTurbiditySpike(ntu, req.spikeDurationSec.getOrElse(15))
                }
                req.imuDriftFactor.foreach { drift =>
                  simulator.setImuDrift(drift)
                }
                req.signalLoss.foreach { loss =>
                  simulator.setSignalLoss(loss)
                }
                req.drainBatteryFast.foreach { drain =>
                  simulator.setFastBatteryDrain(drain)
                }
                if (req.resetMission.contains(true)) {
                  simulator.reset()
                }

                val ack = Map("status" -> "SUCCESS", "message" -> "Scenario injected successfully.")
                complete(HttpEntity(ContentTypes.`application/json`, ack.asJson.noSpaces))

              case Left(err) =>
                complete(StatusCodes.BadRequest, s"Invalid scenario payload: ${err.getMessage}")
            }
          }
        }
      },

      // External real ESP32 Telemetry ingestion endpoint
      path("telemetry") {
        post {
          entity(as[String]) { jsonStr =>
            decode[TelemetryRaw](jsonStr) match {
              case Right(raw) =>
                sparkProcessor.appendLiveReading(raw)
                val fixed = simulator.fixedFilter.update(raw)
                val adaptive = simulator.adaptiveFilter.update(raw)
                val dr = simulator.deadReckon.update(raw)

                val noiseScale = simulator.adaptiveFilter.computeNoiseScale(raw.ntu)
                val imuTrust = math.max(0.1, 1.0 - (noiseScale - 1.0) * 0.18)
                val depthTrust = math.max(0.15, 1.0 / noiseScale)
                val filterConfidence = math.max(20.0, 100.0 - (noiseScale - 1.0) * 18.0)

                val trust = TrustMetrics(
                  imuTrust = (imuTrust * 100.0).round / 100.0,
                  depthTrust = (depthTrust * 100.0).round / 100.0,
                  turbidityScale = noiseScale,
                  filterConfidence = (filterConfidence * 10.0).round / 10.0
                )

                val (homing, evtOpt) = simulator.homingMachine.update(
                  x = adaptive.x,
                  y = adaptive.y,
                  depth = raw.depth,
                  battery = raw.battery,
                  isLinkLost = false,
                  manualCommandTriggered = false,
                  missionId = raw.mission_id,
                  ts = raw.ts,
                  ntu = raw.ntu
                )

                evtOpt.foreach(database.saveEvent)

                val fused = FusedTelemetry(
                  raw = raw,
                  groundTruth = GroundTruth(adaptive.x, adaptive.y, raw.depth, 0.0, 0.0, 0.0, 0.0, 0.0, raw.heading),
                  fixedFilter = fixed,
                  adaptiveFilter = adaptive,
                  deadReckoning = dr,
                  trustMetrics = trust,
                  homingStatus = homing,
                  rmseFixed = 1.2,
                  rmseAdaptive = 0.8,
                  improvementPct = 33.3,
                  driftHaloRadius = math.max(0.5, adaptive.uncertaintyTrace * 0.4)
                )

                database.saveTelemetry(fused)

                val ack = Map("status" -> "TELEMETRY_INGESTED", "mission_id" -> raw.mission_id)
                complete(HttpEntity(ContentTypes.`application/json`, ack.asJson.noSpaces))

              case Left(err) =>
                complete(StatusCodes.BadRequest, s"Malformed ESP32 telemetry JSON: ${err.getMessage}")
            }
          }
        }
      },

      // Root / Health check
      pathEndOrSingleSlash {
        get {
          complete(
            HttpEntity(
              ContentTypes.`application/json`,
              """{"service":"Inland Deep Console API","version":"1.0.0","status":"OPERATIONAL"}"""
            )
          )
        }
      }
    )
  }
}
