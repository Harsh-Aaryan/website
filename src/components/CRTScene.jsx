import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  ContactShadows,
  Decal,
  Environment,
  SoftShadows,
  useGLTF,
  useProgress,
  useTexture,
} from '@react-three/drei'
import { Bloom, DepthOfField, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { ROOM } from '../config'
import { useBootTexture } from './ScreenBoot'

const CRT_SCALE = 1.42
const START_CAM = { pos: [0.74, 0.54, 1.72], look: [0.02, 0.28, 0.02], fov: 32 }
const END_CAM = { pos: [0.015, 0.405, 0.44], look: [0.0, 0.392, 0.155], fov: 24 }

// Television 02 local space: screen oval sits on the +Z bulge above the speaker bar.
const SCREEN = {
  position: [0.0, 0.293, 0.116],
  size: [0.292, 0.188],
  bend: 0.042,
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function lerp3(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

function curveGeometry(width, height, bend) {
  const geo = new THREE.PlaneGeometry(width, height, 48, 36)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i) / width
    const y = pos.getY(i) / height
    pos.setZ(i, bend * (1 - (x * x + y * y * 0.62)))
  }
  geo.computeVertexNormals()
  return geo
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
    const width = mesh.geometry.parameters?.width ?? SCREEN.size[0]
    const height = mesh.geometry.parameters?.height ?? SCREEN.size[1]
    const corners = [
      new THREE.Vector3(-width / 2, -height / 2, 0),
      new THREE.Vector3(width / 2, -height / 2, 0),
      new THREE.Vector3(width / 2, height / 2, 0),
      new THREE.Vector3(-width / 2, height / 2, 0),
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

function VintageCRT({ screenRef, bootMap }) {
  const { scene } = useGLTF('/assets/scene/television_02.glb')
  const mesh = useMemo(() => {
    let found = null
    scene.traverse((obj) => {
      if (obj.isMesh && !found) found = obj
    })
    return found
  }, [scene])

  useLayoutEffect(() => {
    if (!mesh?.material) return
    mesh.castShadow = true
    mesh.receiveShadow = true
    const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    mats.forEach((mat) => {
      mat.envMapIntensity = 0.55
      mat.roughness = Math.min((mat.roughness ?? 0.42) + 0.08, 0.7)
      if (mat.color) mat.color.multiply(new THREE.Color(1.06, 0.96, 0.84))
    })
  }, [mesh])

  const tubeGeo = useMemo(
    () => curveGeometry(SCREEN.size[0] * 0.94, SCREEN.size[1] * 0.94, SCREEN.bend),
    []
  )
  const glassGeo = useMemo(
    () => curveGeometry(SCREEN.size[0], SCREEN.size[1], SCREEN.bend + 0.006),
    []
  )

  if (!mesh) return null

  return (
    <group scale={CRT_SCALE} position={[0, 0, 0]} rotation={[0, 0.14, 0]}>
      <mesh geometry={mesh.geometry} material={mesh.material} castShadow receiveShadow>
        <Decal
          position={SCREEN.position}
          rotation={[0, 0, 0]}
          scale={[SCREEN.size[0], SCREEN.size[1], 0.1]}
        >
          <meshStandardMaterial
            map={bootMap}
            emissiveMap={bootMap}
            emissive={new THREE.Color('#ffb000')}
            emissiveIntensity={0.95}
            transparent
            depthTest
            polygonOffset
            polygonOffsetFactor={-2}
            toneMapped={false}
          />
        </Decal>
      </mesh>
      <mesh
        ref={screenRef}
        geometry={tubeGeo}
        position={[SCREEN.position[0], SCREEN.position[1], SCREEN.position[2] + 0.002]}
        renderOrder={2}
      >
        <meshBasicMaterial map={bootMap} toneMapped={false} transparent opacity={0.92} />
      </mesh>
      <mesh
        geometry={glassGeo}
        position={[SCREEN.position[0], SCREEN.position[1], SCREEN.position[2] + 0.01]}
        renderOrder={3}
      >
        <meshPhysicalMaterial
          color="#c5d4e0"
          roughness={0.07}
          metalness={0.02}
          transparent
          opacity={0.13}
          clearcoat={0.9}
          clearcoatRoughness={0.2}
          envMapIntensity={1.5}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

function Desk() {
  const [albedo, normal, rough] = useTexture([
    '/assets/scene/dark_wood_diff_1k.webp',
    '/assets/scene/dark_wood_nor_gl_1k.webp',
    '/assets/scene/dark_wood_rough_1k.webp',
  ])
  useEffect(() => {
    ;[albedo, normal, rough].forEach((tex) => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping
      tex.repeat.set(2.8, 1.6)
      tex.anisotropy = 8
    })
    albedo.colorSpace = THREE.SRGBColorSpace
  }, [albedo, normal, rough])

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.18]} receiveShadow>
        <planeGeometry args={[3.4, 2.1]} />
        <meshStandardMaterial
          map={albedo}
          normalMap={normal}
          roughnessMap={rough}
          color="#6a4a32"
          roughness={0.9}
          metalness={0.02}
          envMapIntensity={0.16}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.012, 0.18]} receiveShadow>
        <planeGeometry args={[8, 6]} />
        <meshStandardMaterial color="#1a120c" roughness={0.96} envMapIntensity={0.08} />
      </mesh>
    </group>
  )
}

function NightRoom() {
  const [albedo, normal, rough] = useTexture([
    '/assets/scene/painted_plaster_wall_diff_1k.webp',
    '/assets/scene/painted_plaster_wall_nor_gl_1k.webp',
    '/assets/scene/painted_plaster_wall_rough_1k.webp',
  ])
  const city = useTexture('/assets/scene/modern_buildings_night.webp')
  useEffect(() => {
    ;[albedo, normal, rough].forEach((tex) => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping
      tex.repeat.set(2.2, 1.4)
      tex.anisotropy = 4
    })
    albedo.colorSpace = THREE.SRGBColorSpace
    city.colorSpace = THREE.SRGBColorSpace
  }, [albedo, city, normal, rough])

  const wallMat = {
    map: albedo,
    normalMap: normal,
    roughnessMap: rough,
    color: '#3d4450',
    roughness: 0.92,
    metalness: 0.02,
    envMapIntensity: 0.12,
  }

  return (
    <group>
      <mesh position={[0, 1.15, -2.15]} receiveShadow>
        <planeGeometry args={[7.2, 2.6]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>
      <mesh position={[-2.35, 1.15, 0.15]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[4.6, 2.6]} />
        <meshStandardMaterial {...wallMat} />
      </mesh>
      <mesh position={[2.6, 1.15, 0.15]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[4.6, 2.6]} />
        <meshStandardMaterial {...wallMat} color="#2c3138" />
      </mesh>
      <mesh position={[0, 2.4, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[7.2, 5]} />
        <meshStandardMaterial color="#0a0c10" roughness={1} />
      </mesh>

      <group position={[-2.33, 1.22, 0.08]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <planeGeometry args={[1.38, 1.18]} />
          <meshBasicMaterial map={city} toneMapped={false} />
        </mesh>
        <mesh position={[0, 0.62, 0.01]}>
          <boxGeometry args={[1.5, 0.05, 0.04]} />
          <meshStandardMaterial color="#141820" roughness={0.7} />
        </mesh>
        <mesh position={[0, -0.62, 0.01]}>
          <boxGeometry args={[1.5, 0.05, 0.04]} />
          <meshStandardMaterial color="#141820" roughness={0.7} />
        </mesh>
        <mesh position={[-0.72, 0, 0.01]}>
          <boxGeometry args={[0.05, 1.29, 0.04]} />
          <meshStandardMaterial color="#141820" roughness={0.7} />
        </mesh>
        <mesh position={[0.72, 0, 0.01]}>
          <boxGeometry args={[0.05, 1.29, 0.04]} />
          <meshStandardMaterial color="#141820" roughness={0.7} />
        </mesh>
        <mesh position={[0, 0, 0.01]}>
          <boxGeometry args={[0.03, 1.18, 0.02]} />
          <meshStandardMaterial color="#141820" roughness={0.7} />
        </mesh>
      </group>

      {[-0.55, 0.15, 0.85].map((x, i) => (
        <group key={x} position={[x, 1.42, -2.05]}>
          <mesh castShadow>
            <boxGeometry args={[0.62, 0.04, 0.18]} />
            <meshStandardMaterial color="#2a241c" roughness={0.86} />
          </mesh>
          <mesh position={[-0.16, 0.16, 0]} castShadow>
            <boxGeometry args={[0.18, 0.28, 0.12]} />
            <meshStandardMaterial color={i === 1 ? '#3a2a1c' : '#1d2430'} roughness={0.8} />
          </mesh>
          <mesh position={[0.14, 0.12, 0]} castShadow>
            <boxGeometry args={[0.16, 0.2, 0.1]} />
            <meshStandardMaterial color="#252018" roughness={0.84} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Keyboard() {
  return (
    <group position={[0.06, 0.028, 0.52]} rotation={[0.04, 0.16, 0]}>
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.46, 0.028, 0.16]} />
        <meshStandardMaterial color="#c4ae86" roughness={0.62} metalness={0.04} envMapIntensity={0.3} />
      </mesh>
      {Array.from({ length: 5 }).map((_, row) =>
        Array.from({ length: 14 }).map((__, col) => (
          <mesh
            key={`${row}-${col}`}
            position={[-0.195 + col * 0.03, 0.018, -0.05 + row * 0.026]}
            castShadow
          >
            <boxGeometry args={[0.024, 0.01, 0.022]} />
            <meshStandardMaterial color="#2a2418" roughness={0.45} />
          </mesh>
        ))
      )}
    </group>
  )
}

function Dust() {
  const ref = useRef()
  const positions = useMemo(() => {
    const arr = new Float32Array(140 * 3)
    for (let i = 0; i < 140; i += 1) {
      arr[i * 3] = (Math.random() - 0.55) * 3.4
      arr[i * 3 + 1] = 0.15 + Math.random() * 1.5
      arr[i * 3 + 2] = (Math.random() - 0.35) * 2.6
    }
    return arr
  }, [])
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.012
  })
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#8aa0b4" size={0.007} transparent opacity={0.16} depthWrite={false} />
    </points>
  )
}

function LoadBridge({ onProgress, onReady }) {
  const { progress, active, loaded } = useProgress()
  const readyRef = useRef(false)
  const onReadyRef = useRef(onReady)
  const onProgressRef = useRef(onProgress)
  onReadyRef.current = onReady
  onProgressRef.current = onProgress

  useEffect(() => {
    onProgressRef.current?.(Math.max(progress, loaded > 0 ? progress : 8))
    if (readyRef.current) return
    if (!active && progress >= 99 && loaded > 0) {
      readyRef.current = true
      onReadyRef.current?.()
    }
  }, [active, loaded, progress])

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (!readyRef.current) {
        readyRef.current = true
        onReadyRef.current?.()
      }
    }, 4000)
    return () => window.clearTimeout(id)
  }, [])

  return null
}

function Scene({ zoom, onScreenRect, bootRunning, reducedMotion }) {
  const screenRef = useRef()
  const bootMap = useBootTexture({ running: bootRunning, reduced: reducedMotion })
  const { scene } = useThree()

  useEffect(() => {
    scene.background = new THREE.Color(ROOM.dark)
  }, [scene])

  return (
    <>
      <color attach="background" args={[ROOM.dark]} />
      <fog attach="fog" args={['#0b0e13', 3.4, 8.5]} />
      <SoftShadows size={16} samples={8} focus={0.55} />
      <hemisphereLight args={['#6d8496', '#120e0a', 0.07]} />
      <spotLight
        position={[-1.85, 1.55, 0.2]}
        angle={0.42}
        penumbra={0.85}
        intensity={1.15}
        color="#8fb4c9"
        distance={6}
        decay={2}
        castShadow
      />
      <spotLight
        position={[0.04, 0.5, 0.28]}
        angle={0.95}
        penumbra={0.9}
        intensity={1.35}
        color="#ffb000"
        distance={2.4}
        decay={2}
        castShadow
      />
      <pointLight position={[0.12, 0.1, 0.42]} intensity={0.28} color="#d08928" distance={1.5} decay={2} />
      <ambientLight intensity={0.045} color="#5a6570" />
      <Environment files="/assets/scene/unfinished_office_night_1k.hdr" environmentIntensity={0.22} background={false} />
      <NightRoom />
      <Desk />
      <VintageCRT screenRef={screenRef} bootMap={bootMap} />
      <Keyboard />
      <ContactShadows position={[0, 0.001, 0.12]} opacity={0.62} scale={3.8} blur={2.4} far={1.3} color="#000" />
      <Dust />
      <CameraRig zoom={zoom} screenRef={screenRef} onScreenRect={onScreenRect} />
      {zoom < 0.92 && (
        <EffectComposer disableNormalPass multisampling={0}>
          <Bloom intensity={0.15} luminanceThreshold={0.84} mipmapBlur />
          <DepthOfField
            focusDistance={0.014}
            focalLength={0.012}
            bokehScale={zoom > 0.25 ? 0.55 : 1.35}
          />
          <Noise opacity={0.02} />
          <Vignette offset={0.3} darkness={0.58} />
        </EffectComposer>
      )}
    </>
  )
}

export default function CRTScene({ zoom, onScreenRect, onReady, onProgress, bootRunning, reducedMotion }) {
  return (
    <div className="scene-layer scene-canvas">
      <Canvas
        dpr={[1, 1.5]}
        shadows
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.88,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        camera={{ position: START_CAM.pos, fov: START_CAM.fov }}
      >
        <LoadBridge onProgress={onProgress} onReady={onReady} />
        <Scene
          zoom={zoom}
          onScreenRect={onScreenRect}
          bootRunning={bootRunning}
          reducedMotion={reducedMotion}
        />
      </Canvas>
    </div>
  )
}

useGLTF.preload('/assets/scene/television_02.glb')
