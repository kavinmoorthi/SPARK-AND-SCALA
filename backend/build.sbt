name := "inland-deep-backend"
organization := "inlanddeep"
version := "1.0.0"

scalaVersion := "2.13.13"

val sparkVersion = "3.5.1"
val pekkoVersion = "1.0.2"
val pekkoHttpVersion = "1.0.1"
val circeVersion = "0.14.6"

libraryDependencies ++= Seq(
  // Apache Spark
  "org.apache.spark" %% "spark-core" % sparkVersion,
  "org.apache.spark" %% "spark-sql" % sparkVersion,
  "org.apache.spark" %% "spark-streaming" % sparkVersion,

  // Apache Pekko & HTTP
  "org.apache.pekko" %% "pekko-actor-typed" % pekkoVersion,
  "org.apache.pekko" %% "pekko-stream" % pekkoVersion,
  "org.apache.pekko" %% "pekko-http" % pekkoHttpVersion,
  "org.apache.pekko" %% "pekko-http-spray-json" % pekkoHttpVersion,
  "org.apache.pekko" %% "pekko-http-cors" % pekkoHttpVersion,

  // JSON handling with Circe
  "io.circe" %% "circe-core" % circeVersion,
  "io.circe" %% "circe-generic" % circeVersion,
  "io.circe" %% "circe-parser" % circeVersion,

  // Storage
  "org.xerial" % "sqlite-jdbc" % "3.45.2.0",

  // Testing
  "org.scalatest" %% "scalatest" % "3.2.18" % Test
)

fork := true

javaOptions ++= Seq(
  "--add-opens=java.base/java.lang=ALL-UNNAMED",
  "--add-opens=java.base/java.lang.invoke=ALL-UNNAMED",
  "--add-opens=java.base/java.lang.reflect=ALL-UNNAMED",
  "--add-opens=java.base/java.io=ALL-UNNAMED",
  "--add-opens=java.base/java.net=ALL-UNNAMED",
  "--add-opens=java.base/java.nio=ALL-UNNAMED",
  "--add-opens=java.base/java.util=ALL-UNNAMED",
  "--add-opens=java.base/java.util.concurrent=ALL-UNNAMED",
  "--add-opens=java.base/java.util.concurrent.atomic=ALL-UNNAMED",
  "--add-opens=java.base/sun.nio.ch=ALL-UNNAMED",
  "--add-opens=java.base/sun.nio.cs=ALL-UNNAMED",
  "--add-opens=java.base/sun.security.action=ALL-UNNAMED",
  "--add-opens=java.base/sun.util.calendar=ALL-UNNAMED",
  "-Dspark.master=local[*]",
  "-Dspark.sql.shuffle.partitions=2",
  "-Dspark.ui.enabled=false"
)
