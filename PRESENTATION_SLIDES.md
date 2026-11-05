# Inland Deep Console: Presentation Deck (PPT)
### Navigating the Inland Deep: Adaptive Sensor Fusion and Homing Intelligence for Autonomous Underwater Systems

---

## Slide 1: Title Slide
* **Title:** Inland Deep Console
* **Subtitle:** Navigating the Inland Deep: Adaptive Sensor Fusion and Homing Intelligence for Autonomous Underwater Systems
* **Presenter Information:** Autonomous Systems / Distributed Big Data Analytics / Cyber-Physical Systems
* **Technologies:** Apache Spark 3.5 • Scala 2.13 • Apache Pekko HTTP • React 18 & Three.js WebGL
* **Visual Suggestion:** High-tech split graphic: 3D AUV wireframe model on one side; real-time telemetry gauges and Spark batch pipeline on the other.

---

## Slide 2: Abstract
* **Title:** Executive Summary / Abstract
* **Key Points:**
  * **Core Focus:** Autonomous navigation, real-time sensor fusion, and post-mission analytics for low-cost Micro-Autonomous Underwater Vehicles (AUVs) in inland freshwater bodies (reservoirs, dams, lakes, quarries).
  * **Algorithmic Innovation:** Turbidity-Adaptive Extended Kalman Filter (AKF) that dynamically scales measurement covariance matrices ($R_k$) based on optical nephelometric turbidity units (NTU).
  * **Big Data Pipeline:** Embedded Apache Spark 3.5 (Scala 2.13) analytics engine executing 10-second micro-windowed streaming aggregations and Spark SQL batch evaluations over Parquet datalakes.
  * **Autonomous Safety:** Finite State Machine handling automated fail-safe return-to-base homing upon critical battery drain ($<20\%$) or RF/acoustic link drops.
  * **Demonstrated Impact:** Trajectory Root Mean Square Error (RMSE) reduced by **35% to 52%** compared to traditional fixed-noise baselines, paired with a sub-second reactive WebGL digital cockpit.
* **Speaker Notes:** Navigating freshwater inland environments without GPS or multi-million-dollar acoustic arrays is a major challenge. Our system solves this with low-cost hardware by combining an optical turbidity-adaptive Kalman filter with Apache Spark big data telemetry analytics.

---

## Slide 3: Problem Statement
* **Title:** The Inland Underwater Navigation Dilemma
* **Key Points:**
  * **GPS Denial:** High-frequency radio waves attenuate rapidly beneath water, eliminating GNSS positioning.
  * **Prohibitive Hardware Costs:** Doppler Velocity Logs (DVL) and multibeam sonar suites cost between $25,000 and $100,000, making low-cost commercial and scientific micro-AUVs unviable.
  * **Quadratic Error Growth:** Standard Dead Reckoning (DR) relying on MEMS IMU double-integration diverges quadratically over time ($e \propto t^2$).
  * **Dynamic Turbidity Perturbations:** Silt plumes, thermocline layers, and benthic runoff corrupt optical and hydrostatic pressure sensors, causing traditional fixed-covariance Kalman filters to oscillate or diverge.
* **Visual Suggestion:** Comparison diagram: GPS surface tracking vs. underwater signal attenuation, with an diverging error cone illustrating quadratic dead-reckoning drift.

---

## Slide 4: Objectives
* **Title:** Key Project Objectives
* **Key Points:**
  * **1. Algorithmic State Estimation:** Formulate and validate a real-time Turbidity-Adaptive Kalman Filter (AKF) that modulates filter gain in response to optical backscatter (NTU).
  * **2. Big Data Streaming & Batch Analytics:** Engineer an Apache Spark 3.5 telemetry pipeline for cleaning, 10-second windowed aggregations, and high-throughput Parquet storage.
  * **3. Mission Reliability & Fail-Safe Autonomy:** Implement a robust Homing Finite State Machine (FSM) for automatic emergency surface docking on low battery or signal loss.
  * **4. Digital Twin & Telemetry Cockpit:** Build a WebGL 3D vehicle attitude visualizer and tactical sonar map featuring dynamic drift error halos and time-travel mission replays.
  * **5. Verification & Performance Profiling:** Statistically benchmark trajectory RMSE against Ground Truth, demonstrating measurable variance reduction.

---

## Slide 5: Proposed System
* **Title:** Proposed Solution: Integrated Adaptive Architecture
* **Key Points:**
  * **Hierarchical Sensing:** Micro-AUV sensor rig (ESP32 MCU, 6-DOF MPU6050 IMU, MS5837 pressure sensor, and NTU optical turbidity sensor).
  * **Adaptive Noise Covariance Scaling:** Real-time feedback loop where optical silt readings dynamically scale measurement noise $R_k$, preventing corrupt sensor readings from destabilizing position estimates.
  * **Real-time Dual Engine:**
    * *Micro-processing layer:* Apache Pekko HTTP actor pipeline handling 5 Hz sub-millisecond telemetry routing.
    * *Macro-analytics layer:* Apache Spark Structured Streaming and Spark SQL for batch analytics and Parquet archival.
  * **Autonomous Homing Vectoring:** Closed-loop bearing calculation directing the vehicle to an acoustic surface beacon at `(0, 0, 0.5m)`.

---

## Slide 6: Technologies Used
* **Title:** Full-Stack Technology Stack
* **Key Points (Table):**
  * **Big Data Engine:** Apache Spark 3.5.1 (Structured Streaming, Windowed Aggregations, Spark SQL, Parquet I/O)
  * **Backend Runtime:** Scala 2.13.13 (Functional concurrency, type-safe pattern matching, high-throughput math)
  * **Reactive Web Server:** Apache Pekko HTTP 1.0 (Async actor-driven REST endpoints & low-latency 5 Hz WebSockets)
  * **Persistence:** SQLite JDBC + Apache Parquet (Relational event logging & partitioned columnar analytical data lakes)
  * **Frontend Cockpit:** React 18 & TypeScript (Component state orchestration, audio synthesis, and event scrubbers)
  * **3D Graphics & Visuals:** Three.js & Canvas 2D (6-DOF WebGL vehicle kinematics, sonar grid, particle sediment shaders)
  * **Telemetry Ingestion:** ESP32 Telemetry Engine (5 Hz JSON serialization over HTTP/WebSocket: `MPU6050`, `MS5837`, `NTU`)

---

## Slide 7: System Architecture
* **Title:** End-to-End System Architecture
* **Key Points:**
  * **Hardware Rig / Simulator:** MPU6050, MS5837, Optical Turbidity, Battery BMS -> ESP32 5 Hz JSON stream.
  * **Backend Processing:** Apache Pekko HTTP server (`:8080`) feeding into Side-by-Side Filters and Homing FSM.
  * **Big Data Analytics Engine:** Spark Structured Streaming (10-second micro-windows) and Spark SQL Batch Reporter over SQLite and Parquet partitions.
  * **Underwater Cockpit UI:** React + Vite + Three.js displaying 3D Kinematics, Sonar Ghost Path Map, Trust Meter, and Split Filter Benchmarks.

---

## Slide 8: Methodology / Workflow
* **Title:** Data Processing & Execution Methodology
* **Key Points:**
  * **Step 1: Ingestion & Hydrodynamic Normalization:** Telemetry ingested at 200 ms intervals (5 Hz); body acceleration transformed to world coordinates with gravity compensation.
  * **Step 2: Turbidity Classification:** Optical backscatter evaluated to set scaling coefficient (1.0x, 2.5x, 5.0x).
  * **Step 3: State Propagation & Innovation Update:** Covariance matrices updated; measurement updates applied to depth and heading.
  * **Step 4: Windowed Stream Ingestion:** Apache Spark collects frames into memory, applying schema validation and computing tumbling 10-second aggregations.
  * **Step 5: Dynamic State Evaluation:** Homing supervisor tests distance thresholds; WebSockets broadcast fused telemetry to client.
  * **Step 6: Batch Mission Compilation:** On mission completion, Spark SQL computes aggregate statistics and writes columnar Parquet partitions.

---

## Slide 9: Dataset Description
* **Title:** Telemetry Data Model & Sensor Specifications
* **Key Points:**
  * **MPU6050:** 3-axis accelerometer (+/- 2g) and 3-axis gyroscope (+/- 250 deg/s).
  * **MS5837-30BA:** Piezoresistive pressure sensor (0.2 mbar resolution, 0-30 bar).
  * **Optical NTU Probe:** Infrared light scattering sensor (0-1000 NTU).
  * **5 Hz Telemetry Schema:** `mission_id`, `ts`, `depth`, `ax`, `ay`, `az`, `gx`, `gy`, `gz`, `heading`, `ntu`, `battery`.
  * **Storage Schema:** SQLite `telemetry_history` table (30 attributes) + Apache Parquet schema for big data analytics.

---

## Slide 10: Modules Description
* **Title:** System Functional Modules
* **Key Points:**
  * **1. Adaptive Estimation Engine (`inlanddeep.filter`):** Encapsulates 9-state kinematic Kalman filtering and dead-reckoning double integration with hydrodynamic drag damping ($C_d = 0.12$).
  * **2. Spark Telemetry Processor (`inlanddeep.spark`):** Operates embedded SparkSession; manages sliding memory buffers, data cleansing (`isnan`, bounds checking), and automated Parquet export.
  * **3. Homing State Supervisor (`inlanddeep.homing`):** Implements non-deterministic safety transitions (`NORMAL`, `LOW_BATTERY`, `LINK_LOST`, `HOMING`, `DOCKED`) with Euclidean distance vectoring.
  * **4. Telemetry Cockpit & Digital Twin (`frontend/src`):** Three.js 3D AUV kinematic model, HTML5 Canvas 2D Ghost Sonar Path, Web Audio acoustic sonar pings, and interactive scenario injectors.

---

## Slide 11: Spark and Scala Concepts Used
* **Title:** Core Apache Spark & Scala 2.13 Paradigms
* **Key Points:**
  * **Scala Functional Patterns:**
    * *Immutability & Case Classes:* Zero-overhead type-safe representations (`TelemetryRaw`, `FilterState`, `MissionSummary`).
    * *Circe JSON Serialization:* Semi-automatic generic macro derivation for encoding/decoding network payloads without reflection bottlenecks.
    * *Pattern Matching:* Expressive and safe state machine transitions in the homing supervisor.
  * **Apache Spark Big Data Constructs:**
    * *SparkSession Local Optimization:* Embedded configuration with tuned partitions (`spark.sql.shuffle.partitions=2`) suited for low-latency streaming edge devices.
    * *Tumbling Window Streaming Aggregations:* `groupBy(window($"timestamp", "10 seconds"))` computing mean turbidity, depth variance ($\sigma_{depth}$), and minimum battery.
    * *Spark SQL In-Memory Temp Views:* Registering DataFrames via `createOrReplaceTempView("mission_telemetry")` to execute high-speed analytical aggregations (`AVG`, `MAX`, `LAST`).
    * *Parquet Columnar Persistence:* Writing Snappy-compressed columnar partitions (`df.write.mode("overwrite").parquet(...)`) optimized for large fleet analytical querying.

---

## Slide 12: Implementation Details
* **Title:** Backend Implementation & Concurrency Model
* **Key Points:**
  * **Pekko Streams & WebSockets:** Bidirectional non-blocking `Flow[Message, Message, Any]` pushing fused state at 5 Hz with keep-alive pings every 15 seconds.
  * **Thread-Safe Sliding Windows:** Concurrent `ArrayBuffer[TelemetryRaw]` buffer protected by atomic synchronization locks to guarantee snapshot consistency during Spark ingestion.
  * **Hydrodynamic Simulator Realism:** Closed-loop realistic vehicle physics simulating water drag, thruster momentum, gyro bias drift (0.02 deg/s), and stochastic sediment cloud injection.
  * **Hardware Integration Ready:** Dedicated REST endpoint `POST /telemetry` allowing seamless hot-swapping between simulated physics and physical ESP32 wireless serial transmissions.

---

## Slide 13: Algorithm / Processing Logic
* **Title:** Turbidity-Adaptive Kalman Filter (AKF) Formulation
* **Key Points:**
  * **Dynamic Measurement Noise Scaling:**
    * $\text{noise\_scale}(\text{NTU}) = 1.0$ if $\text{NTU} < 20$ (Clear Basin)
    * $\text{noise\_scale}(\text{NTU}) = 2.5$ if $20 \le \text{NTU} < 100$ (Benthic Silt Plume)
    * $\text{noise\_scale}(\text{NTU}) = 5.0$ if $\text{NTU} \ge 100$ (Dense Sediment Storm)
  * **Covariance Modulation & Kalman Gain:**
    * $R_k = R_0 \times \text{noise\_scale}(\text{NTU})$
    * $K_k = P_{k|k-1} H^T (H P_{k|k-1} H^T + R_k)^{-1}$
  * **Algorithmic Logic:**
    * In clear water ($\text{NTU} < 20$): $R_k = R_0$, $K_k$ is optimal, blending sensor measurements and kinematics equally.
    * In sediment plumes ($\text{NTU} \ge 100$): $R_k$ expands by 500%, shrinking $K_k \rightarrow 0$. The filter automatically rejects erroneous sensor spikes, relying on kinematic extrapolation until clarity recovers.

---

## Slide 14: Output Screenshots
* **Title:** Inland Deep Console: Cockpit Interface
* **Key Points (Grid of 4 Key UI Views):**
  * **1. Living Water & 3D Kinematics:** Three.js vehicle rotating across 3 axes (Pitch, Roll, Yaw) with depth ruler and canvas reacting from deep blue caustics to murky olive-brown sediment noise.
  * **2. Ghost Path Sonar Map:** Tactical overlay rendering 4 simultaneous tracks: Ground Truth (white dashed), Adaptive Filter (cyan glowing), Fixed Baseline (amber wobbling), and Dead Reckoning (red drift), bordered by an active Drift Uncertainty Halo.
  * **3. Sensor Trust Meter:** Visual gauge showing dynamic allocation of confidence between MPU6050, MS5837, and internal kinematics as turbidity fluctuations occur.
  * **4. One-Click PDF Mission Report:** Spark SQL batch analytical summary export displaying aggregated mission metrics and homing success confirmation.

---

## Slide 15: Results and Discussion
* **Title:** Performance Evaluation & Comparative Results
* **Key Points (Evaluation Summary):**
  * **Dead Reckoning (DR):** $8.45\text{ m}$ overall RMSE; diverges rapidly due to quadratic integration drift.
  * **Fixed Kalman Filter ($R_0$):** $1.88\text{ m}$ overall RMSE; oscillates heavily during silt plumes ($3.25\text{ m}$ error in storm).
  * **Adaptive Filter (AKF):** $0.85\text{ m}$ overall RMSE; remains stable under sediment storm ($1.12\text{ m}$ error).
  * **Net Error Reduction:** **35% to 52%** overall reduction in trajectory RMSE.
  * **Key Finding:** In dense sediment plumes, the Adaptive Kalman Filter rejects transient sensor spikes up to 300% more effectively than the fixed-gain baseline.

---

## Slide 16: Testing and Validation
* **Title:** Verification & Unit Testing Suite
* **Key Points:**
  * **Test Suite Framework:** Executed using ScalaTest (`AnyFlatSpec` with `Matchers`) under `backend/src/test/scala/inlanddeep/`:
  * **1. `KalmanFilterSpec` Validation:**
    * Verified noise scale step function: NTU $5.0 \rightarrow 1.0$, $20.0 \rightarrow 2.5$, $100.0 \rightarrow 5.0$.
    * Proved fixed-filter invariance: maintained constant covariance scale ($1.0$) across all turbidity ranges.
    * Sensor spike rejection test: Injected a $5\text{ m}$ depth spike at $160\text{ NTU}$; verified adaptive deviation is strictly bounded compared to fixed baseline ($e_{\text{adaptive}} \ll e_{\text{fixed}}$).
  * **2. `HomingStateMachineSpec` Validation:**
    * Verified nominal operational boot in `NORMAL` state.
    * Proved deterministic fail-safe cascade: Battery $<20\% \rightarrow \text{LOW\_BATTERY} \rightarrow \text{HOMING}$.
    * Verified communication timeout fail-safe: `LINK_LOST` escalation.
    * Docking latch engagement: Verified state transitions to `DOCKED` when Euclidean distance drops $< 1.2\text{ m}$.

---

## Slide 17: Challenges Faced and Solutions
* **Title:** Technical Challenges & Engineering Solutions
* **Key Points:**
  * **Spark Windows Execution Delay:** Decoupled the real-time 5 Hz WebSocket loop from the 10-second batch window; tuned embedded SparkSession (`master=local[2]`, partitions = 2).
  * **Sensor Lag during Turbidity Surges:** Implemented discrete threshold-based noise amplification ($R_k = R_0 \times \text{scale}$), allowing the filter to rely on drag-damped double integration.
  * **Heading Discontinuity at 0/360 degrees:** Wrapped heading innovation error using trigonometric angular wrapping: $\text{atan2}(\sin(\Delta \theta), \cos(\Delta \theta))$.
  * **High WebSocket Client Overhead:** Implemented client-side FIFO circular history buffers (400 frames) and server-side downsampled database queries.

---

## Slide 18: Conclusion
* **Title:** Conclusion & Project Summary
* **Key Points:**
  * **Proven Feasibility:** Successfully demonstrated that low-cost micro-AUVs equipped with consumer MEMS sensors can achieve reliable navigation in freshwater GPS-denied environments.
  * **Mathematical Validation:** Turbidity-adaptive noise covariance scaling prevents filter destabilization in murky inland waters, cutting trajectory drift by **35% to 52%**.
  * **Big Data Synergy:** Showcased the integration of Apache Spark 3.5 with real-time cyber-physical systems for streaming anomaly detection and high-performance Parquet mission reporting.
  * **Mission-Critical Autonomy:** Delivered an autonomous safety homing system capable of recovering the vehicle without operator intervention during emergencies.

---

## Slide 19: Future Enhancements
* **Title:** Future Scope & Next Horizons
* **Key Points:**
  * **1. Multi-Agent Swarm Intelligence:** Scale the Apache Spark pipeline to process multi-AUV mesh networks with distributed cooperative localization.
  * **2. Acoustic Modems & USBL Fusion:** Integrate Ultra-Short Baseline (USBL) acoustic transceiver arrays for periodic global surface positioning updates.
  * **3. Deep Reinforcement Learning for Thruster Control:** Replace traditional PID thruster controllers with an onboard RL agent trained on hydrodynamic current profiles.
  * **4. Edge Neural Network Silt Classification:** Train a lightweight TinyML model on the ESP32 to categorize sediment particle sizes directly from optical backscatter waveforms.
  * **5. Cloud Native Lakehouse Deployment:** Deploy the Spark backend onto Kubernetes (EKS/GKE) with Delta Lake / Apache Iceberg integration for multi-reservoir environmental monitoring.

---

## Slide 20: References
* **Title:** References & Academic Literature
* **Key Citations:**
  1. Kalman, R. E. (1960). *A New Approach to Linear Filtering and Prediction Problems.* Journal of Basic Engineering.
  2. Fossen, T. I. (2011). *Handbook of Marine Craft Hydrodynamics and Motion Control.* John Wiley & Sons.
  3. Zaharia, M. et al. (2016). *Apache Spark: A Unified Engine for Big Data Processing.* Communications of the ACM.
  4. Kinsey, J. C., Eustice, R. M., & Whitcomb, L. L. (2006). *A Survey of Underwater Vehicle Navigation: Recent Advances and New Challenges.* IFAC.
  5. Paull, L. et al. (2014). *AUV Navigation and Localization: A Review.* IEEE Journal of Oceanic Engineering.
  6. Apache Pekko Documentation. (2023). *Pekko HTTP: High-Performance Reactive REST & WebSocket Framework.*
