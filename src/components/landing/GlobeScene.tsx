"use client";

import { Component, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { geoEquirectangular, geoGraticule, geoPath } from "d3-geo";
import * as THREE from "three";
import { countryFeature, landFeature } from "@/lib/world";

const RADIUS = 2;

function latLngToVector3(lat: number, lng: number, radius: number, target = new THREE.Vector3()) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lng + 180) * Math.PI) / 180;
  return target.set(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function createLabel(text: string, color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);
  ctx.clearRect(0, 0, 512, 128);
  ctx.font = "600 36px ui-monospace, monospace";
  ctx.fillStyle = color;
  ctx.fillText(text, 8, 74);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createEarthTexture() {
  const width = 2048;
  const height = 1024;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.CanvasTexture(canvas);

  ctx.fillStyle = "#0c3d66";
  ctx.fillRect(0, 0, width, height);
  const basins = [
    { x: 420, y: 520, r: 280, c: "rgba(6, 28, 48, 0.85)" },
    { x: 1100, y: 430, r: 360, c: "rgba(4, 22, 40, 0.8)" },
    { x: 1600, y: 560, r: 300, c: "rgba(8, 32, 48, 0.75)" },
  ];
  for (const basin of basins) {
    const gradient = ctx.createRadialGradient(basin.x, basin.y, 20, basin.x, basin.y, basin.r);
    gradient.addColorStop(0, basin.c);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(basin.x, basin.y, basin.r, 0, Math.PI * 2);
    ctx.fill();
  }

  const projection = geoEquirectangular()
    .scale(width / (2 * Math.PI))
    .translate([width / 2, height / 2]);
  const path = geoPath(projection, ctx);

  ctx.beginPath();
  path(geoGraticule().step([15, 15])() as never);
  ctx.strokeStyle = "rgba(0, 240, 255, 0.09)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  path(landFeature as never);
  ctx.fillStyle = "#1f7f96";
  ctx.fill();
  ctx.lineWidth = 2.4;
  ctx.strokeStyle = "rgba(210, 255, 255, 0.95)";
  ctx.stroke();

  ctx.beginPath();
  path(countryFeature as never);
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = "rgba(186, 248, 255, 0.45)";
  ctx.stroke();

  const ports = [
    [56.35, 25.12],
    [103.85, 1.29],
    [4.48, 51.92],
    [-95.0, 29.73],
    [121.8, 31.23],
    [55.0, 25.2],
    [114.1, 22.3],
  ];
  ctx.fillStyle = "#00FF88";
  for (const [lng, lat] of ports) {
    const point = projection([lng, lat]);
    if (!point) continue;
    ctx.beginPath();
    ctx.arc(point[0], point[1], 3.2, 0, Math.PI * 2);
    ctx.fill();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

const earthVertex = `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const earthFragment = `
  uniform sampler2D uMap;
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vec3 base = texture2D(uMap, vUv).rgb;
    vec3 n = normalize(vNormal);
    float light = clamp(dot(n, normalize(vec3(0.15, 0.28, 1.0))) * 0.35 + 0.78, 0.7, 1.15);
    float fres = pow(1.0 - max(dot(n, vec3(0.0, 0.0, 1.0)), 0.0), 1.7);
    vec3 color = base * light + vec3(0.15, 0.95, 1.0) * fres * 0.55;
    gl_FragColor = vec4(color, 1.0);
  }
`;

const atmosphereVertex = `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const atmosphereFragment = `
  varying vec3 vNormal;
  void main() {
    float intensity = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.15);
    gl_FragColor = vec4(0.0, 0.9, 1.0, 1.0) * intensity;
  }
`;

function Earth() {
  const texture = useMemo(() => createEarthTexture(), []);
  const uniforms = useMemo(() => ({ uMap: { value: texture } }), [texture]);
  useEffect(() => () => texture.dispose(), [texture]);
  return (
    <mesh>
      <sphereGeometry args={[RADIUS, 96, 96]} />
      <shaderMaterial uniforms={uniforms} vertexShader={earthVertex} fragmentShader={earthFragment} />
    </mesh>
  );
}

function Atmosphere() {
  return (
    <mesh scale={1.14}>
      <sphereGeometry args={[RADIUS, 64, 64]} />
      <shaderMaterial
        vertexShader={atmosphereVertex}
        fragmentShader={atmosphereFragment}
        blending={THREE.AdditiveBlending}
        side={THREE.BackSide}
        transparent
        depthWrite={false}
      />
    </mesh>
  );
}

function Stars() {
  const geometry = useMemo(() => {
    const positions = new Float32Array(1600 * 3);
    for (let i = 0; i < 1600; i++) {
      const r = 10 + Math.random() * 16;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);
  return (
    <points geometry={geometry}>
      <pointsMaterial color="#d7f6ff" size={0.028} sizeAttenuation transparent opacity={0.85} depthWrite={false} />
    </points>
  );
}

function Footprint({ lat, lng, color }: { lat: number; lng: number; color: string }) {
  const ref = useRef<THREE.Mesh>(null);
  const position = useMemo(() => latLngToVector3(lat, lng, RADIUS + 0.015), [lat, lng]);
  const quaternion = useMemo(() => {
    const normal = latLngToVector3(lat, lng, 1).normalize();
    return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
  }, [lat, lng]);
  useFrame(({ clock }) => {
    const pulse = 1 + Math.sin(clock.elapsedTime * 2.2) * 0.06;
    ref.current?.scale.setScalar(pulse);
  });
  return (
    <mesh ref={ref} position={position} quaternion={quaternion}>
      <ringGeometry args={[0.13, 0.18, 64]} />
      <meshBasicMaterial color={color} transparent opacity={0.9} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  );
}

function LoiterSatellite({
  lat,
  lng,
  name,
  color,
  phase,
}: {
  lat: number;
  lng: number;
  name: string;
  color: string;
  phase: number;
}) {
  const group = useRef<THREE.Group>(null);
  const beam = useRef<THREE.Mesh>(null);
  const label = useMemo(() => createLabel(name, color), [name, color]);
  const scratch = useRef({
    n: new THREE.Vector3(),
    tangent: new THREE.Vector3(),
    bitangent: new THREE.Vector3(),
    pos: new THREE.Vector3(),
    ground: new THREE.Vector3(),
    toSat: new THREE.Vector3(),
    local: new THREE.Vector3(),
    up: new THREE.Vector3(0, 1, 0),
    east: new THREE.Vector3(1, 0, 0),
  });

  useEffect(() => () => label.dispose(), [label]);

  useFrame(({ clock }) => {
    if (!group.current || !beam.current) return;
    const s = scratch.current;
    const t = clock.elapsedTime * 0.32 + phase;
    const normal = latLngToVector3(lat, lng, 1, s.n).normalize();
    const helper = Math.abs(normal.y) > 0.9 ? s.east : s.up;
    s.tangent.copy(helper).cross(normal).normalize();
    s.bitangent.copy(normal).cross(s.tangent).normalize();
    s.pos
      .copy(normal)
      .multiplyScalar(3.42)
      .addScaledVector(s.tangent, Math.cos(t) * 0.36)
      .addScaledVector(s.bitangent, Math.sin(t * 0.82) * 0.24);
    group.current.position.copy(s.pos);
    latLngToVector3(lat, lng, RADIUS + 0.02, s.ground);
    s.toSat.copy(s.pos).sub(s.ground);
    const length = Math.max(0.25, s.toSat.length());
    s.toSat.multiplyScalar(1 / length);
    s.local.copy(s.toSat).multiplyScalar(-length / 2);
    beam.current.position.copy(s.local);
    beam.current.quaternion.setFromUnitVectors(s.up, s.toSat);
    beam.current.scale.set(1, length, 1);
  });

  return (
    <group ref={group}>
      <mesh>
        <octahedronGeometry args={[0.048, 0]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <sprite position={[0.02, 0.2, 0]} scale={[1.45, 0.36, 1]}>
        <spriteMaterial map={label} transparent depthWrite={false} />
      </sprite>
      <mesh ref={beam}>
        <cylinderGeometry args={[0.02, 0.2, 1, 24, 1, true]} />
        <meshBasicMaterial color={color} transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

function Iceye() {
  const ref = useRef<THREE.Group>(null);
  const label = useMemo(() => createLabel("ICEYE", "#00FF88"), []);
  const orbit = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 160; i++) {
      const t = (i / 160) * Math.PI * 2;
      const radius = 3.55;
      points.push(new THREE.Vector3(Math.cos(t) * radius, Math.sin(t) * radius * Math.sin(0.7), Math.sin(t) * radius * Math.cos(0.7)));
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    return new THREE.Line(
      geometry,
      new THREE.LineBasicMaterial({ color: "#00FF88", transparent: true, opacity: 0.4 })
    );
  }, []);
  useEffect(() => () => label.dispose(), [label]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime * 0.22;
    const radius = 3.55;
    ref.current?.position.set(
      Math.cos(t) * radius,
      Math.sin(t) * radius * Math.sin(0.7),
      Math.sin(t) * radius * Math.cos(0.7)
    );
  });
  return (
    <>
      <primitive object={orbit} />
      <group ref={ref}>
        <mesh>
          <octahedronGeometry args={[0.05, 0]} />
          <meshBasicMaterial color="#00FF88" />
        </mesh>
        <sprite position={[0.05, 0.2, 0]} scale={[1.2, 0.3, 1]}>
          <spriteMaterial map={label} transparent depthWrite={false} />
        </sprite>
      </group>
    </>
  );
}

function Rig({ globe }: { globe: React.RefObject<THREE.Group | null> }) {
  const { gl, camera } = useThree();
  const rot = useRef({ y: 0, x: 0.22, vy: 0.035, vx: 0 });
  const drag = useRef({ on: false, lx: 0, ly: 0 });
  const pointer = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const facing = latLngToVector3(24.35, 58.4, 1);
    rot.current.y = Math.atan2(-facing.x, facing.z);
  }, []);

  useEffect(() => {
    const el = gl.domElement;
    const down = (event: PointerEvent) => {
      drag.current.on = true;
      drag.current.lx = event.clientX;
      drag.current.ly = event.clientY;
    };
    const move = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      pointer.current.x = (event.clientX - rect.left) / rect.width - 0.5;
      pointer.current.y = (event.clientY - rect.top) / rect.height - 0.5;
      if (!drag.current.on) return;
      const dx = event.clientX - drag.current.lx;
      const dy = event.clientY - drag.current.ly;
      drag.current.lx = event.clientX;
      drag.current.ly = event.clientY;
      rot.current.y += dx * 0.005;
      rot.current.x = Math.max(-0.6, Math.min(0.75, rot.current.x + dy * 0.003));
      rot.current.vy = dx * 0.00035;
      rot.current.vx = dy * 0.0002;
    };
    const up = () => {
      drag.current.on = false;
    };
    el.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
  }, [gl]);

  useFrame(() => {
    if (!drag.current.on) {
      rot.current.vy = rot.current.vy * 0.94 + 0.03 * 0.06;
      rot.current.vx *= 0.9;
      rot.current.x += (0.2 - rot.current.x) * 0.015;
    }
    rot.current.y += rot.current.vy;
    rot.current.x += rot.current.vx;
    if (globe.current) {
      globe.current.rotation.y = rot.current.y + pointer.current.x * 0.08;
      globe.current.rotation.x = rot.current.x - pointer.current.y * 0.05;
    }
    const cam = camera as THREE.PerspectiveCamera;
    cam.position.x += (pointer.current.x * 0.28 - cam.position.x) * 0.04;
    cam.position.y += (0.18 - pointer.current.y * 0.2 - cam.position.y) * 0.04;
    cam.lookAt(0, 0, 0);
  });

  return null;
}

function Scene() {
  const globe = useRef<THREE.Group>(null);
  return (
    <>
      <Rig globe={globe} />
      <Stars />
      <group ref={globe}>
        <Earth />
        <Atmosphere />
        <Footprint lat={24.3} lng={58.52} color="#00FF88" />
        <Footprint lat={15.1} lng={114.4} color="#00FF88" />
        <LoiterSatellite lat={24.3} lng={58.52} name="SENTINEL-1A" color="#00F0FF" phase={0.2} />
        <LoiterSatellite lat={15.1} lng={114.4} name="CAPELLA RADAR" color="#7AF6FF" phase={1.4} />
        <Iceye />
      </group>
    </>
  );
}

class Boundary extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) {
      return (
        <div className="grid h-full place-items-center">
          <div className="h-64 w-64 rounded-full border border-aether-cyan/40 shadow-cyan" />
        </div>
      );
    }
    return this.props.children;
  }
}

export function GlobeScene() {
  return (
    <Boundary>
      <Canvas
        camera={{ position: [0, 0.18, 6.15], fov: 32 }}
        dpr={[1, 1.6]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
        style={{ width: "100%", height: "100%", touchAction: "none" }}
      >
        <Scene />
      </Canvas>
    </Boundary>
  );
}
