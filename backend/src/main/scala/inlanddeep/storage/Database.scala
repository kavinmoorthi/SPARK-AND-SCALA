package inlanddeep.storage

import inlanddeep.model._
import java.io.File
import java.sql.{Connection, DriverManager, ResultSet}
import scala.collection.mutable.ArrayBuffer

class Database(dbPath: String = "data/inland_deep.db") {

  Class.forName("org.sqlite.JDBC")

  private def getConnection: Connection = {
    // Ensure parent dir exists
    val dbFile = new File(dbPath)
    Option(dbFile.getParentFile).foreach(_.mkdirs())
    DriverManager.getConnection(s"jdbc:sqlite:$dbPath")
  }

  def init(): Unit = {
    val conn = getConnection
    try {
      val stmt = conn.createStatement()

      stmt.execute(
        """
          |CREATE TABLE IF NOT EXISTS missions (
          |  id TEXT PRIMARY KEY,
          |  name TEXT,
          |  start_time INTEGER,
          |  end_time INTEGER,
          |  status TEXT,
          |  avg_turbidity REAL,
          |  max_depth REAL,
          |  min_battery REAL,
          |  total_samples INTEGER,
          |  rmse_fixed REAL,
          |  rmse_adaptive REAL,
          |  improvement_pct REAL,
          |  homing_state TEXT,
          |  homing_trigger TEXT,
          |  homing_success INTEGER
          |);
          |""".stripMargin
      )

      stmt.execute(
        """
          |CREATE TABLE IF NOT EXISTS events (
          |  id INTEGER PRIMARY KEY AUTOINCREMENT,
          |  mission_id TEXT,
          |  ts INTEGER,
          |  event_type TEXT,
          |  severity TEXT,
          |  description TEXT,
          |  ntu REAL,
          |  depth REAL
          |);
          |""".stripMargin
      )

      stmt.execute(
        """
          |CREATE TABLE IF NOT EXISTS telemetry_history (
          |  id INTEGER PRIMARY KEY AUTOINCREMENT,
          |  mission_id TEXT,
          |  ts INTEGER,
          |  depth REAL,
          |  ax REAL, ay REAL, az REAL,
          |  gx REAL, gy REAL, gz REAL,
          |  heading REAL, ntu REAL, battery REAL,
          |  true_x REAL, true_y REAL, true_depth REAL,
          |  fixed_x REAL, fixed_y REAL, fixed_depth REAL,
          |  adaptive_x REAL, adaptive_y REAL, adaptive_depth REAL,
          |  dr_x REAL, dr_y REAL, dr_depth REAL,
          |  imu_trust REAL, depth_trust REAL, turbidity_scale REAL, filter_confidence REAL,
          |  homing_state TEXT, beacon_dist REAL, beacon_bearing REAL,
          |  rmse_fixed REAL, rmse_adaptive REAL, improvement_pct REAL
          |);
          |""".stripMargin
      )

      stmt.close()

      // Seed initial historical missions if empty so the user can immediately test replay
      seedHistoricalMissions(conn)
    } finally {
      conn.close()
    }
  }

  private def seedHistoricalMissions(conn: Connection): Unit = {
    val checkStmt = conn.createStatement()
    val rs = checkStmt.executeQuery("SELECT COUNT(*) FROM missions;")
    val count = if (rs.next()) rs.getInt(1) else 0
    checkStmt.close()

    if (count == 0) {
      val now = System.currentTimeMillis()
      val past1 = now - 86400000L * 2
      val past2 = now - 86400000L

      insertMissionSummary(MissionSummary(
        missionId = "MISSION-ALPHA-01",
        startTime = past1,
        endTime = past1 + 1800000L,
        durationSec = 1800.0,
        avgTurbidity = 24.6,
        maxDepth = 18.4,
        minBattery = 34.2,
        totalSamples = 4500L,
        rmseFixed = 1.48,
        rmseAdaptive = 0.89,
        improvementPct = 39.8,
        homingState = "DOCKED",
        homingTrigger = "Operator manual home return override",
        homingSuccess = true
      ))

      insertMissionSummary(MissionSummary(
        missionId = "MISSION-BETA-02",
        startTime = past2,
        endTime = past2 + 2400000L,
        durationSec = 2400.0,
        avgTurbidity = 62.1,
        maxDepth = 22.1,
        minBattery = 18.5,
        totalSamples = 6000L,
        rmseFixed = 2.34,
        rmseAdaptive = 1.15,
        improvementPct = 50.8,
        homingState = "DOCKED",
        homingTrigger = "Critical power alert: Battery at 19.8% <= threshold 20.0%",
        homingSuccess = true
      ))
    }
  }

  def insertMissionSummary(m: MissionSummary): Unit = {
    val conn = getConnection
    try {
      val ps = conn.prepareStatement(
        """
          |INSERT OR REPLACE INTO missions (
          |  id, name, start_time, end_time, status, avg_turbidity, max_depth, min_battery,
          |  total_samples, rmse_fixed, rmse_adaptive, improvement_pct, homing_state, homing_trigger, homing_success
          |) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
          |""".stripMargin
      )
      ps.setString(1, m.missionId)
      ps.setString(2, s"Lake Survey ${m.missionId}")
      ps.setLong(3, m.startTime)
      ps.setLong(4, m.endTime)
      ps.setString(5, m.homingState)
      ps.setDouble(6, m.avgTurbidity)
      ps.setDouble(7, m.maxDepth)
      ps.setDouble(8, m.minBattery)
      ps.setLong(9, m.totalSamples)
      ps.setDouble(10, m.rmseFixed)
      ps.setDouble(11, m.rmseAdaptive)
      ps.setDouble(12, m.improvementPct)
      ps.setString(13, m.homingState)
      ps.setString(14, m.homingTrigger)
      ps.setInt(15, if (m.homingSuccess) 1 else 0)
      ps.executeUpdate()
      ps.close()
    } finally {
      conn.close()
    }
  }

  def saveTelemetry(f: FusedTelemetry): Unit = {
    val conn = getConnection
    try {
      val ps = conn.prepareStatement(
        """
          |INSERT INTO telemetry_history (
          |  mission_id, ts, depth, ax, ay, az, gx, gy, gz, heading, ntu, battery,
          |  true_x, true_y, true_depth,
          |  fixed_x, fixed_y, fixed_depth,
          |  adaptive_x, adaptive_y, adaptive_depth,
          |  dr_x, dr_y, dr_depth,
          |  imu_trust, depth_trust, turbidity_scale, filter_confidence,
          |  homing_state, beacon_dist, beacon_bearing,
          |  rmse_fixed, rmse_adaptive, improvement_pct
          |) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
          |""".stripMargin
      )
      ps.setString(1, f.raw.mission_id)
      ps.setLong(2, f.raw.ts)
      ps.setDouble(3, f.raw.depth)
      ps.setDouble(4, f.raw.ax)
      ps.setDouble(5, f.raw.ay)
      ps.setDouble(6, f.raw.az)
      ps.setDouble(7, f.raw.gx)
      ps.setDouble(8, f.raw.gy)
      ps.setDouble(9, f.raw.gz)
      ps.setDouble(10, f.raw.heading)
      ps.setDouble(11, f.raw.ntu)
      ps.setDouble(12, f.raw.battery)

      ps.setDouble(13, f.groundTruth.x)
      ps.setDouble(14, f.groundTruth.y)
      ps.setDouble(15, f.groundTruth.depth)

      ps.setDouble(16, f.fixedFilter.x)
      ps.setDouble(17, f.fixedFilter.y)
      ps.setDouble(18, f.fixedFilter.depth)

      ps.setDouble(19, f.adaptiveFilter.x)
      ps.setDouble(20, f.adaptiveFilter.y)
      ps.setDouble(21, f.adaptiveFilter.depth)

      ps.setDouble(22, f.deadReckoning.x)
      ps.setDouble(23, f.deadReckoning.y)
      ps.setDouble(24, f.deadReckoning.depth)

      ps.setDouble(25, f.trustMetrics.imuTrust)
      ps.setDouble(26, f.trustMetrics.depthTrust)
      ps.setDouble(27, f.trustMetrics.turbidityScale)
      ps.setDouble(28, f.trustMetrics.filterConfidence)

      ps.setString(29, f.homingStatus.state)
      ps.setDouble(30, f.homingStatus.beaconDistance)
      ps.setDouble(31, f.homingStatus.beaconBearing)

      ps.setDouble(32, f.rmseFixed)
      ps.setDouble(33, f.rmseAdaptive)
      ps.setDouble(34, f.improvementPct)

      ps.executeUpdate()
      ps.close()
    } finally {
      conn.close()
    }
  }

  def saveEvent(e: MissionEvent): Unit = {
    val conn = getConnection
    try {
      val ps = conn.prepareStatement(
        "INSERT INTO events (mission_id, ts, event_type, severity, description, ntu, depth) VALUES (?, ?, ?, ?, ?, ?, ?);"
      )
      ps.setString(1, e.missionId)
      ps.setLong(2, e.ts)
      ps.setString(3, e.eventType)
      ps.setString(4, e.severity)
      ps.setString(5, e.description)
      ps.setDouble(6, e.ntu)
      ps.setDouble(7, e.depth)
      ps.executeUpdate()
      ps.close()
    } finally {
      conn.close()
    }
  }

  def getMissions: Seq[MissionSummary] = {
    val conn = getConnection
    val list = ArrayBuffer[MissionSummary]()
    try {
      val stmt = conn.createStatement()
      val rs = stmt.executeQuery("SELECT * FROM missions ORDER BY start_time DESC;")
      while (rs.next()) {
        val st = rs.getLong("start_time")
        val et = rs.getLong("end_time")
        list += MissionSummary(
          missionId = rs.getString("id"),
          startTime = st,
          endTime = et,
          durationSec = math.max(1.0, (et - st) / 1000.0),
          avgTurbidity = rs.getDouble("avg_turbidity"),
          maxDepth = rs.getDouble("max_depth"),
          minBattery = rs.getDouble("min_battery"),
          totalSamples = rs.getLong("total_samples"),
          rmseFixed = rs.getDouble("rmse_fixed"),
          rmseAdaptive = rs.getDouble("rmse_adaptive"),
          improvementPct = rs.getDouble("improvement_pct"),
          homingState = rs.getString("homing_state"),
          homingTrigger = rs.getString("homing_trigger"),
          homingSuccess = rs.getInt("homing_success") == 1
        )
      }
      stmt.close()
    } finally {
      conn.close()
    }
    list.toSeq
  }

  def getMissionEvents(missionId: String): Seq[MissionEvent] = {
    val conn = getConnection
    val list = ArrayBuffer[MissionEvent]()
    try {
      val ps = conn.prepareStatement("SELECT * FROM events WHERE mission_id = ? ORDER BY ts ASC;")
      ps.setString(1, missionId)
      val rs = ps.executeQuery()
      while (rs.next()) {
        list += MissionEvent(
          id = rs.getLong("id"),
          missionId = rs.getString("mission_id"),
          ts = rs.getLong("ts"),
          eventType = rs.getString("event_type"),
          severity = rs.getString("severity"),
          description = rs.getString("description"),
          ntu = rs.getDouble("ntu"),
          depth = rs.getDouble("depth")
        )
      }
      ps.close()
    } finally {
      conn.close()
    }
    list.toSeq
  }

  def getMissionTelemetry(missionId: String, limit: Int = 1000): Seq[FusedTelemetry] = {
    val conn = getConnection
    val list = ArrayBuffer[FusedTelemetry]()
    try {
      val ps = conn.prepareStatement(
        s"SELECT * FROM telemetry_history WHERE mission_id = ? ORDER BY ts ASC LIMIT ?;"
      )
      ps.setString(1, missionId)
      ps.setInt(2, limit)
      val rs = ps.executeQuery()
      while (rs.next()) {
        val raw = TelemetryRaw(
          mission_id = rs.getString("mission_id"),
          ts = rs.getLong("ts"),
          depth = rs.getDouble("depth"),
          ax = rs.getDouble("ax"),
          ay = rs.getDouble("ay"),
          az = rs.getDouble("az"),
          gx = rs.getDouble("gx"),
          gy = rs.getDouble("gy"),
          gz = rs.getDouble("gz"),
          heading = rs.getDouble("heading"),
          ntu = rs.getDouble("ntu"),
          battery = rs.getDouble("battery")
        )
        val groundTruth = GroundTruth(
          x = rs.getDouble("true_x"),
          y = rs.getDouble("true_y"),
          depth = rs.getDouble("true_depth"),
          vx = 0.0, vy = 0.0, vz = 0.0, roll = 0.0, pitch = 0.0, yaw = rs.getDouble("heading")
        )
        val fixed = FilterState(
          x = rs.getDouble("fixed_x"),
          y = rs.getDouble("fixed_y"),
          depth = rs.getDouble("fixed_depth"),
          vx = 0.0, vy = 0.0, vz = 0.0, roll = 0.0, pitch = 0.0, yaw = rs.getDouble("heading"),
          uncertaintyTrace = 1.0, noiseScale = 1.0
        )
        val adaptive = FilterState(
          x = rs.getDouble("adaptive_x"),
          y = rs.getDouble("adaptive_y"),
          depth = rs.getDouble("adaptive_depth"),
          vx = 0.0, vy = 0.0, vz = 0.0, roll = 0.0, pitch = 0.0, yaw = rs.getDouble("heading"),
          uncertaintyTrace = 0.5, noiseScale = rs.getDouble("turbidity_scale")
        )
        val dr = DeadReckoningState(
          x = rs.getDouble("dr_x"),
          y = rs.getDouble("dr_y"),
          depth = rs.getDouble("dr_depth"),
          vx = 0.0, vy = 0.0, heading = rs.getDouble("heading")
        )
        val trust = TrustMetrics(
          imuTrust = rs.getDouble("imu_trust"),
          depthTrust = rs.getDouble("depth_trust"),
          turbidityScale = rs.getDouble("turbidity_scale"),
          filterConfidence = rs.getDouble("filter_confidence")
        )
        val homing = HomingStatus(
          state = rs.getString("homing_state"),
          triggerReason = "",
          beaconDistance = rs.getDouble("beacon_dist"),
          beaconBearing = rs.getDouble("beacon_bearing"),
          isDocked = rs.getString("homing_state") == "DOCKED",
          batteryRemaining = rs.getDouble("battery")
        )

        list += FusedTelemetry(
          raw = raw,
          groundTruth = groundTruth,
          fixedFilter = fixed,
          adaptiveFilter = adaptive,
          deadReckoning = dr,
          trustMetrics = trust,
          homingStatus = homing,
          rmseFixed = rs.getDouble("rmse_fixed"),
          rmseAdaptive = rs.getDouble("rmse_adaptive"),
          improvementPct = rs.getDouble("improvement_pct"),
          driftHaloRadius = math.max(0.5, (1.0 / math.max(0.1, rs.getDouble("filter_confidence") / 100.0)) * 0.8)
        )
      }
      ps.close()
    } finally {
      conn.close()
    }
    list.toSeq
  }

  def getAnalyticsOverview: AnalyticsOverview = {
    val missions = getMissions
    val totalMissions = missions.length
    val avgTurbidity = if (totalMissions > 0) missions.map(_.avgTurbidity).sum / totalMissions else 0.0
    val avgImprovement = if (totalMissions > 0) missions.map(_.improvementPct).sum / totalMissions else 0.0
    val successfulHomingCount = missions.count(_.homingSuccess)
    val homingSuccessRate = if (totalMissions > 0) (successfulHomingCount.toDouble / totalMissions) * 100.0 else 0.0

    AnalyticsOverview(
      totalMissions = totalMissions,
      totalDistanceMeters = missions.map(_.durationSec * 0.8).sum, // approx cruise speed
      avgTurbidityOverall = (avgTurbidity * 10.0).round / 10.0,
      overallImprovementPct = (avgImprovement * 10.0).round / 10.0,
      homingSuccessRatePct = (homingSuccessRate * 10.0).round / 10.0,
      recentMissions = missions.take(5)
    )
  }
}
