"use client";

import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Float, MeshDistortMaterial, Sphere, Ring, Torus, Box, Octahedron, Points, PointMaterial } from "@react-three/drei";
import * as THREE from "three";

// ---- Floating orbs that drift slowly ----
function FloatingOrb({ position, scale, color, speed }: {
  position: [number, number, number];
  scale: number;
  color: string;
  speed: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const startPos = useMemo(() => [...position] as [number, number, number], [position]);

  useFrame((state) => {
    const t = state.clock.elapsedTime * speed;
    if (meshRef.current) {
      meshRef.current.position.y = startPos[1] + Math.sin(t) * 0.3;
      meshRef.current.position.x = startPos[0] + Math.cos(t * 0.7) * 0.2;
      meshRef.current.rotation.x += 0.003;
      meshRef.current.rotation.z += 0.002;
    }
  });

  return (
    <mesh ref={meshRef} position={position} scale={scale}>
      <Sphere args={[1, 32, 32]}>
        <MeshDistortMaterial
          color={color}
          distort={0.4}
          speed={1.5}
          transparent
          opacity={0.12}
          roughness={0}
          metalness={0.8}
        />
      </Sphere>
    </mesh>
  );
}

// ---- The central 3D power symbol ----
function CentralSymbol({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
  const groupRef = useRef<THREE.Group>(null!);
  const ring1 = useRef<THREE.Mesh>(null!);
  const ring2 = useRef<THREE.Mesh>(null!);
  const ring3 = useRef<THREE.Mesh>(null!);
  const core = useRef<THREE.Mesh>(null!);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        mouseX * 0.5,
        0.04
      );
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        mouseY * -0.3,
        0.04
      );
    }
    if (ring1.current) { ring1.current.rotation.z += 0.006; ring1.current.rotation.x += 0.003; }
    if (ring2.current) { ring2.current.rotation.x += 0.008; ring2.current.rotation.y += 0.004; }
    if (ring3.current) { ring3.current.rotation.y -= 0.005; ring3.current.rotation.z -= 0.003; }
    if (core.current) {
      core.current.scale.setScalar(1 + Math.sin(t * 2) * 0.04);
      (core.current.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.4 + Math.sin(t * 2) * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Outer ring */}
      <mesh ref={ring1}>
        <Torus args={[2.2, 0.018, 16, 200]}>
          <meshStandardMaterial color="#C41E3A" emissive="#C41E3A" emissiveIntensity={0.8} transparent opacity={0.6} />
        </Torus>
      </mesh>

      {/* Mid ring */}
      <mesh ref={ring2}>
        <Torus args={[1.6, 0.012, 16, 150]}>
          <meshStandardMaterial color="#C9A84C" emissive="#C9A84C" emissiveIntensity={0.6} transparent opacity={0.5} />
        </Torus>
      </mesh>

      {/* Inner ring */}
      <mesh ref={ring3}>
        <Torus args={[1.0, 0.015, 16, 120]}>
          <meshStandardMaterial color="#C41E3A" emissive="#C41E3A" emissiveIntensity={0.7} transparent opacity={0.5} />
        </Torus>
      </mesh>

      {/* Core octahedron */}
      <mesh ref={core}>
        <Octahedron args={[0.4, 0]}>
          <meshStandardMaterial
            color="#C9A84C"
            emissive="#C9A84C"
            emissiveIntensity={0.4}
            roughness={0.1}
            metalness={1}
            wireframe={false}
          />
        </Octahedron>
      </mesh>

      {/* Wireframe octahedron surrounding */}
      <mesh rotation={[Math.PI / 4, 0, 0]}>
        <Octahedron args={[0.65, 0]}>
          <meshStandardMaterial color="#C41E3A" emissive="#C41E3A" emissiveIntensity={0.3} wireframe transparent opacity={0.4} />
        </Octahedron>
      </mesh>

      {/* Small orbiting cubes */}
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <OrbitingCube key={i} index={i} radius={1.6} />
      ))}
    </group>
  );
}

function OrbitingCube({ index, radius }: { index: number; radius: number }) {
  const meshRef = useRef<THREE.Mesh>(null!);
  const angle = (index / 6) * Math.PI * 2;
  const speed = 0.3 + index * 0.05;

  useFrame((state) => {
    const t = state.clock.elapsedTime * speed + angle;
    if (meshRef.current) {
      meshRef.current.position.x = Math.cos(t) * radius;
      meshRef.current.position.z = Math.sin(t) * radius;
      meshRef.current.position.y = Math.sin(t * 1.3) * 0.5;
      meshRef.current.rotation.x += 0.02;
      meshRef.current.rotation.y += 0.03;
    }
  });

  return (
    <mesh ref={meshRef}>
      <Box args={[0.08, 0.08, 0.08]}>
        <meshStandardMaterial
          color={index % 2 === 0 ? "#C41E3A" : "#C9A84C"}
          emissive={index % 2 === 0 ? "#C41E3A" : "#C9A84C"}
          emissiveIntensity={1}
        />
      </Box>
    </mesh>
  );
}

// ---- Particle field ----
function ParticleField() {
  const count = 800;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 20;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 20;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 12;
    }
    return arr;
  }, []);

  const pointsRef = useRef<THREE.Points>(null!);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02;
      pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.01) * 0.05;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.025} color="#C41E3A" transparent opacity={0.4} sizeAttenuation />
    </points>
  );
}

// ---- Secondary gold particles ----
function GoldDust() {
  const count = 200;
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 1] = (Math.random() - 0.5) * 10;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 6;
    }
    return arr;
  }, []);

  const ref = useRef<THREE.Points>(null!);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = -state.clock.elapsedTime * 0.015;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.04} color="#C9A84C" transparent opacity={0.3} sizeAttenuation />
    </points>
  );
}

// ---- Camera that subtly tracks mouse ----
function CameraRig({ mouseX, mouseY }: { mouseX: number; mouseY: number }) {
  const { camera } = useThree();

  useFrame(() => {
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, mouseX * 0.4, 0.03);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, mouseY * 0.2, 0.03);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

// ---- Main 3D Scene ----
export default function Scene3D() {
  const [mouseX, setMouseX] = useState(0);
  const [mouseY, setMouseY] = useState(0);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMouseX((e.clientX / window.innerWidth) * 2 - 1);
      setMouseY(-((e.clientY / window.innerHeight) * 2 - 1));
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div className="absolute inset-0 z-0">
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
      >
        <ambientLight intensity={0.1} />
        <pointLight position={[5, 5, 5]} intensity={1} color="#C41E3A" />
        <pointLight position={[-5, -5, -5]} intensity={0.5} color="#C9A84C" />
        <pointLight position={[0, 0, 3]} intensity={0.3} color="#ffffff" />

        <CameraRig mouseX={mouseX} mouseY={mouseY} />
        <ParticleField />
        <GoldDust />

        {/* Background orbs */}
        <FloatingOrb position={[-4, 2, -3]} scale={1.8} color="#C41E3A" speed={0.3} />
        <FloatingOrb position={[4, -2, -4]} scale={2.2} color="#8B0000" speed={0.25} />
        <FloatingOrb position={[3, 3, -2]} scale={1.2} color="#C9A84C" speed={0.4} />
        <FloatingOrb position={[-3, -3, -2]} scale={1.5} color="#C41E3A" speed={0.35} />
        <FloatingOrb position={[0, 4, -5]} scale={3} color="#111111" speed={0.15} />

        {/* Central 3D power symbol */}
        <Float speed={0.8} rotationIntensity={0.1} floatIntensity={0.3}>
          <CentralSymbol mouseX={mouseX} mouseY={mouseY} />
        </Float>
      </Canvas>
    </div>
  );
}
