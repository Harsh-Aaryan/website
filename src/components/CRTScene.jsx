import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { ROOM } from '../config'

const START_CAM = { pos: [0.55, 0.72, 3.35], look: [0, 0.42, 0], fov: 42 }
const END_CAM = { pos: [0, 0.46, 0.72], look: [0, 0.46, 0], fov: 28 }

function lerp(a, b, t) {
  return a + (b - a) * t
}

function lerp3(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

function CameraRig({ zoom, screenRef, onScreenRect }) {
  const { camera, size } = useThree()
  const lastRect = useRef(null)

  useFrame(() => {
    const t = zoom
    const pos = lerp3(START_CAM.pos, END_CAM.pos, t)
    const look = lerp3(START_CAM.look, END_CAM.look, t)
    camera.position.set(pos[0], pos[1], pos[2])
    camera.fov = lerp(START_CAM.fov, END_CAM.fov, t)
    camera.lookAt(look[0], look[1], look[2])
    camera.updateProjectionMatrix()

    if (!screenRef.current || !onScreenRect) return
    const mesh = screenRef.current
    const corners = [
      new THREE.Vector3(-1, -1, 0),
      new THREE.Vector3(1, -1, 0),
      new THREE.Vector3(1, 1, 0),
      new THREE.Vector3(-1, 1, 0),
    ].map((local) => {
      const v = local.clone()
      mesh.localToWorld(v)
      v.project(camera)
      return {
        x: (v.x * 0.5 + 0.5) * size.width,
        y: (-v.y * 0.5 + 0.5) * size.height,
      }
    })
    const xs = corners.map((p) => p.x)
    const ys = corners.map((p) => p.y)
    const next = {
      left: Math.min(...xs),
      top: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    }
    const prev = lastRect.current
    if (
      !prev ||
      Math.abs(prev.left - next.left) > 0.75 ||
      Math.abs(prev.top - next.top) > 0.75 ||
      Math.abs(prev.width - next.width) > 0.75 ||
      Math.abs(prev.height - next.height) > 0.75
    ) {
      lastRect.current = next
      onScreenRect(next)
    }
  })

  return null
}

function Monitor({ screenRef }) {
  const plastic = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: ROOM.plastic,
        roughness: 0.62,
        metalness: 0.04,
      }),
    []
  )
  const plasticDark = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: ROOM.plasticShade,
        roughness: 0.7,
        metalness: 0.05,
      }),
    []
  )

  return (
    <group position={[0, 0.62, 0]}>
      <mesh position={[0, 0, -0.22]} material={plastic} castShadow>
        <boxGeometry args={[1.86, 1.42, 0.62]} />
      </mesh>
      <mesh position={[0, 0, 0.08]} material={plasticDark}>
        <boxGeometry args={[1.72, 1.28, 0.12]} />
      </mesh>
      <mesh position={[0, 0, 0.145]} material={plastic}>
        <boxGeometry args={[1.58, 1.16, 0.04]} />
      </mesh>
      <mesh ref={screenRef} position={[0, 0.02, 0.168]} name="screen">
        <planeGeometry args={[1.36, 0.98]} />
        <meshBasicMaterial color="#0e0a05" />
      </mesh>
      <mesh position={[0, 0.02, 0.172]}>
        <planeGeometry args={[1.36, 0.98]} />
        <meshStandardMaterial color="#1a1408" transparent opacity={0.2} roughness={0.2} />
      </mesh>
      <mesh position={[0.72, -0.58, 0.18]}>
        <boxGeometry args={[0.06, 0.03, 0.03]} />
        <meshStandardMaterial color="#ffb000" emissive="#ffb000" emissiveIntensity={2.4} />
      </mesh>
      <mesh position={[0, -0.86, -0.05]} material={plasticDark}>
        <boxGeometry args={[0.42, 0.28, 0.28]} />
      </mesh>
      <mesh position={[0, -1.08, 0.02]} material={plastic} receiveShadow>
        <cylinderGeometry args={[0.42, 0.5, 0.12, 24]} />
      </mesh>
    </group>
  )
}

function Desk() {
  return (
    <group>
      <mesh position={[0, -0.58, 0.1]} receiveShadow>
        <boxGeometry args={[6.4, 0.12, 2.8]} />
        <meshStandardMaterial color={ROOM.wood} roughness={0.86} metalness={0} />
      </mesh>
      <mesh position={[0, -0.52, 0.55]}>
        <boxGeometry args={[1.7, 0.05, 0.55]} />
        <meshStandardMaterial color="#c9b48a" roughness={0.55} />
      </mesh>
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh key={i} position={[-0.72 + i * 0.13, -0.49, 0.55]}>
          <boxGeometry args={[0.1, 0.03, 0.42]} />
          <meshStandardMaterial color="#3a2a18" />
        </mesh>
      ))}
      <mesh position={[1.15, -0.5, 0.42]}>
        <boxGeometry args={[0.16, 0.04, 0.22]} />
        <meshStandardMaterial color="#c9b48a" />
      </mesh>
    </group>
  )
}

function Dust() {
  const ref = useRef()
  const positions = useMemo(() => {
    const arr = new Float32Array(180 * 3)
    for (let i = 0; i < 180; i += 1) {
      arr[i * 3] = (Math.random() - 0.5) * 4
      arr[i * 3 + 1] = Math.random() * 2
      arr[i * 3 + 2] = (Math.random() - 0.5) * 3
    }
    return arr
  }, [])

  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.012
  })

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={180} array={positions} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial color="#8fb4c9" size={0.012} transparent opacity={0.28} depthWrite={false} />
    </points>
  )
}

function Scene({ zoom, onScreenRect, onReady }) {
  const screenRef = useRef()

  useEffect(() => {
    onReady?.()
  }, [onReady])

  return (
    <>
      <color attach="background" args={[ROOM.dark]} />
      <fog attach="fog" args={[ROOM.dark, 4.5, 11]} />
      <ambientLight intensity={0.08} color={ROOM.coolKey} />
      <directionalLight
        position={[-3.2, 2.4, 1.6]}
        intensity={0.55}
        color={ROOM.coolKey}
      />
      <pointLight position={[0, 0.7, 0.9]} intensity={2.1} color="#ffb000" distance={4.2} decay={2} />
      <spotLight
        position={[-2.8, 2.2, 1.4]}
        angle={0.5}
        penumbra={0.8}
        intensity={0.35}
        color={ROOM.coolKey}
      />
      <mesh position={[0, -0.2, -2.4]}>
        <planeGeometry args={[18, 8]} />
        <meshStandardMaterial color={ROOM.light} />
      </mesh>
      <Desk />
      <Monitor screenRef={screenRef} />
      <Dust />
      <CameraRig zoom={zoom} screenRef={screenRef} onScreenRect={onScreenRect} />
    </>
  )
}

export default function CRTScene({ zoom, onScreenRect, onReady }) {
  return (
    <div className="scene-layer scene-canvas">
      <Canvas
        dpr={[1, 1.35]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
        camera={{ position: START_CAM.pos, fov: START_CAM.fov }}
      >
        <Scene zoom={zoom} onScreenRect={onScreenRect} onReady={onReady} />
      </Canvas>
    </div>
  )
}
