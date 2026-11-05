import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FilterState, HomingStatus } from '../types/telemetry';
import { Compass, RotateCcw, Eye } from 'lucide-react';

interface AuvModel3DProps {
  filter: FilterState;
  homing: HomingStatus;
}

export const AuvModel3D: React.FC<AuvModel3DProps> = ({ filter, homing }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const auvGroupRef = useRef<THREE.Group | null>(null);
  const propLeftRef = useRef<THREE.Mesh | null>(null);
  const propRightRef = useRef<THREE.Mesh | null>(null);
  const beaconLightRef = useRef<THREE.PointLight | null>(null);
  const beaconMeshRef = useRef<THREE.Mesh | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const [viewMode, setViewMode] = useState<'orbit' | 'trail'>('orbit');

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x061124, 0.04);

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(4.5, 2.2, 5.0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxDistance = 15;
    controls.minDistance = 2;
    controlsRef.current = controls;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x1a365d, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0x00f2fe, 1.8);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const waterFillLight = new THREE.DirectionalLight(0x0a4b6e, 0.8);
    waterFillLight.position.set(-5, -5, -5);
    scene.add(waterFillLight);

    // Build Detailed 3D AUV Model
    const auv = new THREE.Group();
    auvGroupRef.current = auv;

    // Hull Materials
    const yellowFairingMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b, // Bright survey yellow/orange
      roughness: 0.3,
      metalness: 0.2,
    });
    const darkNavyMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Composite hull
      roughness: 0.5,
      metalness: 0.3,
    });
    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8,
      metalness: 0.8,
      roughness: 0.2,
    });
    const domeMat = new THREE.MeshPhysicalMaterial({
      color: 0x00f2fe,
      transmission: 0.7,
      opacity: 0.85,
      transparent: true,
      roughness: 0.1,
      ior: 1.33,
    });

    // 1. Upper Hull (Toroid / Cylinder)
    const hullGeom = new THREE.CylinderGeometry(0.38, 0.38, 2.2, 32);
    hullGeom.rotateZ(Math.PI / 2);
    const upperHull = new THREE.Mesh(hullGeom, yellowFairingMat);
    upperHull.position.y = 0.05;
    auv.add(upperHull);

    // 2. Lower Keel / Battery Compartment (adds realistic AUV ballast look)
    const keelGeom = new THREE.BoxGeometry(1.8, 0.2, 0.42);
    const keel = new THREE.Mesh(keelGeom, darkNavyMat);
    keel.position.y = -0.22;
    auv.add(keel);

    // 3. Nose Cone Dome (Forward sensor housing)
    const noseGeom = new THREE.SphereGeometry(0.38, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    noseGeom.rotateZ(-Math.PI / 2);
    const nose = new THREE.Mesh(noseGeom, domeMat);
    nose.position.x = 1.1;
    auv.add(nose);

    // Optical NTU Turbidity sensor probe on nose
    const sensorProbeGeom = new THREE.CylinderGeometry(0.04, 0.04, 0.2, 16);
    sensorProbeGeom.rotateZ(Math.PI / 2);
    const sensorProbe = new THREE.Mesh(sensorProbeGeom, metalMat);
    sensorProbe.position.set(1.35, -0.05, 0);
    auv.add(sensorProbe);

    // MS5837 Depth Sensor port (bottom transducer)
    const depthPortGeom = new THREE.CylinderGeometry(0.06, 0.06, 0.12, 16);
    const depthPort = new THREE.Mesh(depthPortGeom, metalMat);
    depthPort.position.set(0.3, -0.35, 0);
    auv.add(depthPort);

    // 4. Tail Cone
    const tailGeom = new THREE.ConeGeometry(0.38, 0.8, 32);
    tailGeom.rotateZ(Math.PI / 2);
    const tail = new THREE.Mesh(tailGeom, darkNavyMat);
    tail.position.x = -1.5;
    auv.add(tail);

    // 5. Fins (Dorsal rudder and dive planes)
    const finMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.4 });
    const dorsalFinGeom = new THREE.BoxGeometry(0.4, 0.35, 0.04);
    const dorsalFin = new THREE.Mesh(dorsalFinGeom, finMat);
    dorsalFin.position.set(-1.4, 0.32, 0);
    auv.add(dorsalFin);

    const divePlaneGeom = new THREE.BoxGeometry(0.4, 0.04, 0.7);
    const divePlanes = new THREE.Mesh(divePlaneGeom, finMat);
    divePlanes.position.set(-1.4, 0, 0);
    auv.add(divePlanes);

    // 6. Twin Shrouded Thrusters (Port & Starboard)
    const shroudGeom = new THREE.CylinderGeometry(0.18, 0.18, 0.35, 24, 1, true);
    shroudGeom.rotateZ(Math.PI / 2);

    const shroudLeft = new THREE.Mesh(shroudGeom, darkNavyMat);
    shroudLeft.position.set(-1.4, -0.1, 0.42);
    auv.add(shroudLeft);

    const shroudRight = new THREE.Mesh(shroudGeom, darkNavyMat);
    shroudRight.position.set(-1.4, -0.1, -0.42);
    auv.add(shroudRight);

    // Propellers
    const propGeom = new THREE.BoxGeometry(0.04, 0.28, 0.05);
    const propLeft = new THREE.Mesh(propGeom, metalMat);
    propLeft.position.set(-1.4, -0.1, 0.42);
    auv.add(propLeft);
    propLeftRef.current = propLeft;

    const propRight = new THREE.Mesh(propGeom, metalMat);
    propRight.position.set(-1.4, -0.1, -0.42);
    auv.add(propRight);
    propRightRef.current = propRight;

    // 7. Bioluminescent Top Beacon LED
    const beaconGeom = new THREE.SphereGeometry(0.08, 16, 16);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0x00e676 });
    const beaconMesh = new THREE.Mesh(beaconGeom, beaconMat);
    beaconMesh.position.set(0.0, 0.45, 0);
    auv.add(beaconMesh);
    beaconMeshRef.current = beaconMesh;

    const beaconLight = new THREE.PointLight(0x00e676, 1.5, 3.0);
    beaconLight.position.set(0.0, 0.5, 0);
    auv.add(beaconLight);
    beaconLightRef.current = beaconLight;

    // Add Under-hull Forward Illumination Spotlight
    const headSpot = new THREE.SpotLight(0x00f2fe, 3.0, 8.0, Math.PI / 5, 0.5);
    headSpot.position.set(1.1, 0, 0);
    headSpot.target.position.set(5.0, -0.5, 0);
    auv.add(headSpot);
    auv.add(headSpot.target);

    scene.add(auv);

    // Water Grid Plane reference (simulated depth stratum)
    const gridHelper = new THREE.GridHelper(15, 15, 0x00f2fe, 0x0e3a5a);
    gridHelper.position.y = -2.5;
    scene.add(gridHelper);

    // Resize handler
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsedTime = clock.getElapsedTime();

      // Spin propellers when in transit
      if (propLeftRef.current && propRightRef.current) {
        propLeftRef.current.rotation.x += delta * 25;
        propRightRef.current.rotation.x -= delta * 25;
      }

      // Beacon flashing/pulsing
      if (beaconMeshRef.current && beaconLightRef.current) {
        if (homing.state === 'HOMING' || homing.state === 'LOW_BATTERY') {
          // Warning pulse: rapid bright amber/crimson
          const pulse = (Math.sin(elapsedTime * 8) + 1) * 0.5;
          const col = homing.state === 'LOW_BATTERY' ? 0xff4757 : 0xff9f1c;
          beaconMeshRef.current.material = new THREE.MeshBasicMaterial({ color: col });
          beaconLightRef.current.color.setHex(col);
          beaconLightRef.current.intensity = 1.0 + pulse * 2.5;
        } else if (homing.state === 'DOCKED') {
          beaconMeshRef.current.material = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
          beaconLightRef.current.color.setHex(0x00f2fe);
          beaconLightRef.current.intensity = 2.0;
        } else {
          // Normal: gentle green heartbeat
          const pulse = (Math.sin(elapsedTime * 3) + 1) * 0.5;
          beaconMeshRef.current.material = new THREE.MeshBasicMaterial({ color: 0x00e676 });
          beaconLightRef.current.color.setHex(0x00e676);
          beaconLightRef.current.intensity = 0.5 + pulse * 1.2;
        }
      }

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Sync with live telemetry (Pitch, Roll, Heading, Depth)
  useEffect(() => {
    if (!auvGroupRef.current) return;
    const auv = auvGroupRef.current;

    // Convert degrees to radians
    // Heading (yaw) rotates around Y
    // Pitch rotates around Z (since hull points along X)
    // Roll rotates around X
    const pitchRad = THREE.MathUtils.degToRad(-filter.pitch);
    const rollRad = THREE.MathUtils.degToRad(filter.roll);
    const yawRad = THREE.MathUtils.degToRad(-filter.yaw);

    // Smoothly slerp / lerp rotation
    auv.rotation.y = THREE.MathUtils.lerp(auv.rotation.y, yawRad, 0.2);
    auv.rotation.z = THREE.MathUtils.lerp(auv.rotation.z, pitchRad, 0.2);
    auv.rotation.x = THREE.MathUtils.lerp(auv.rotation.x, rollRad, 0.2);

    // Depth bobbing translation: map depth (0m to 25m) to subtle vertical float
    const normalizedDepthY = -(filter.depth / 25.0) * 1.5;
    auv.position.y = THREE.MathUtils.lerp(auv.position.y, normalizedDepthY, 0.15);
  }, [filter.pitch, filter.roll, filter.yaw, filter.depth]);

  const resetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(4.5, 2.2, 5.0);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  return (
    <div className="relative w-full h-full min-h-[340px] rounded-2xl bg-abyss-900/70 border border-slate-800/80 backdrop-blur-md overflow-hidden flex shadow-2xl">
      {/* 3D Viewport */}
      <div ref={mountRef} className="relative flex-1 h-full cursor-grab active:cursor-grabbing" />

      {/* Floating HUD Badges inside 3D View */}
      <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-abyss-950/80 border border-biolum-cyan/30 backdrop-blur-md text-xs font-mono text-slate-200">
          <div className="w-2 h-2 rounded-full bg-biolum-cyan animate-pulse" />
          <span>AUV KINEMATICS (3-AXIS)</span>
        </div>
        <div className="grid grid-cols-3 gap-1 px-3 py-1.5 rounded-lg bg-abyss-950/80 border border-slate-800 text-[11px] font-mono">
          <span className="text-slate-400">PITCH: <b className="text-biolum-cyan">{filter.pitch.toFixed(1)}°</b></span>
          <span className="text-slate-400">ROLL: <b className="text-biolum-teal">{filter.roll.toFixed(1)}°</b></span>
          <span className="text-slate-400">HEADING: <b className="text-biolum-electric">{filter.yaw.toFixed(1)}°</b></span>
        </div>
      </div>

      {/* Controls Overlay */}
      <div className="absolute top-4 right-14 z-10 flex gap-2">
        <button
          onClick={resetCamera}
          title="Reset Camera View"
          className="p-2 rounded-lg bg-abyss-950/80 border border-slate-700/80 hover:border-biolum-cyan text-slate-300 hover:text-biolum-cyan transition-all text-xs flex items-center gap-1 shadow-md"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span className="font-mono text-[10px]">RESET</span>
        </button>
      </div>

      {/* Vertical Depth Ruler Bar on the side */}
      <div className="w-12 border-l border-slate-800/80 bg-abyss-950/60 flex flex-col items-center justify-between py-3 select-none text-[10px] font-mono text-slate-400 relative z-10">
        <div className="text-[9px] font-bold text-biolum-cyan tracking-wider">DEPTH</div>
        
        {/* Ruler tick marks */}
        <div className="relative flex-1 w-full flex flex-col justify-between py-2 items-center">
          {[0, 5, 10, 15, 20, 25].map((d) => (
            <div key={d} className="flex items-center w-full justify-between px-1">
              <span className="text-[9px] text-slate-500">{d}m</span>
              <div className="w-2 h-[1px] bg-slate-700" />
            </div>
          ))}

          {/* Animated Depth Needle */}
          <div
            className="absolute right-0 w-full flex items-center justify-end px-1 transition-all duration-300"
            style={{
              top: `${Math.min(95, Math.max(5, (filter.depth / 25.0) * 100))}%`,
            }}
          >
            <div className="px-1 py-0.5 rounded bg-biolum-cyan text-abyss-950 font-bold text-[9px] shadow-[0_0_8px_rgba(0,242,254,0.6)]">
              {filter.depth.toFixed(1)}m
            </div>
            <div className="w-3 h-0.5 bg-biolum-cyan" />
          </div>
        </div>

        <div className="text-[9px] text-slate-500 font-mono">MS5837</div>
      </div>
    </div>
  );
};
