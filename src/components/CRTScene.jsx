import { Canvas, useFrame, useThree } from '@react-three/fiber'
import {
  ContactShadows,
  Environment,
  SoftShadows,
  useGLTF,
  useProgress,
  useTexture,
} from '@react-three/drei'
import { Bloom, DepthOfField, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useBootTexture } from './ScreenBoot'

const CRT_SCALE = 0.5
const CRT_LIFT = 0.502 * CRT_SCALE
const CRT_YAW = 0.16

const START_CAM = { pos: [0.5, 0.42, 1.2], look: [-0.14, 0.24, 0.06], fov: 32 }
const END_CAM = { pos: [0.016, 0.326, 0.62], look: [0.0, 0.32, 0.25], fov: 24 }

// Beige CRT local space (origin at bounding-box center, Y-up, screen on +Z).
// z sits just in front of the model's own black glass so the BIOS is visible.
const SCREEN = {
  position: [0.0, 0.146, 0.496],
  size: [0.518, 0.392],
  bend: 0.038,
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function lerp3(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

function curveGeometry(width, height, bend) {
  const geo = new THREE.PlaneGeometry(width, height, 56, 40)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i) / width
    const y = pos.getY(i) / height
    pos.setZ(i, bend * (1 - (x * x * 0.92 + y * y * 0.68)))
  }
  geo.computeVertexNormals()
  return geo
}

function makeTubeMask() {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(size, size)
  const n = 3.45
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = (x / (size - 1)) * 2 - 1
      const v = (y / (size - 1)) * 2 - 1
      const d = (Math.abs(u) ** n + Math.abs(v) ** n) ** (1 / n)
      const edge = THREE.MathUtils.smoothstep(d, 0.78, 1.02)
      const a = Math.round((1 - edge) * 255)
      const i = (y * size + x) * 4
      img.data[i] = img.data[i + 1] = img.data[i + 2] = a
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.NoColorSpace
  tex.flipY = true
  return tex
}

function makeGlassSheen() {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 256
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, 256, 256)
  const streak = ctx.createLinearGradient(20, 0, 200, 256)
  streak.addColorStop(0, 'rgba(200, 220, 235, 0)')
  streak.addColorStop(0.38, 'rgba(190, 214, 230, 0.22)')
  streak.addColorStop(0.5, 'rgba(200, 220, 235, 0)')
  streak.addColorStop(1, 'rgba(200, 220, 235, 0)')
  ctx.fillStyle = streak
  ctx.fillRect(0, 0, 256, 256)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

function CameraRig({ zoomRef }) {
  const { camera } = useThree()

  useFrame(() => {
    const t = zoomRef?.current ?? 0
    const pos = lerp3(START_CAM.pos, END_CAM.pos, t)
    const look = lerp3(START_CAM.look, END_CAM.look, t)
    camera.position.set(pos[0], pos[1], pos[2])
    camera.fov = lerp(START_CAM.fov, END_CAM.fov, t)
    camera.lookAt(look[0], look[1], look[2])
    camera.updateProjectionMatrix()
  })

  return null
}

function NightEnv() {
  const tex = useTexture('/assets/scene/unfinished_office_night_512.jpg')
  useEffect(() => {
    tex.mapping = THREE.EquirectangularReflectionMapping
    tex.colorSpace = THREE.SRGBColorSpace
  }, [tex])
  return <Environment map={tex} environmentIntensity={0.12} background={false} />
}

function VintageCRT({ bootMap }) {
  const { scene } = useGLTF('/assets/scene/crt_monitor_beige.glb')
  const mask = useMemo(() => makeTubeMask(), [])
  const sheen = useMemo(() => makeGlassSheen(), [])
  const cloned = useMemo(() => scene.clone(true), [scene])

  useLayoutEffect(() => {
    cloned.traverse((obj) => {
      if (!obj.isMesh) return
      obj.castShadow = true
      obj.receiveShadow = true
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
      mats.forEach((mat) => {
        mat.envMapIntensity = 0.22
        mat.roughness = Math.min((mat.roughness ?? 0.5) + 0.22, 0.9)
        mat.metalness = 0.02
        if (mat.color) mat.color.multiply(new THREE.Color('#d4be94'))
      })
    })
  }, [cloned])

  const tubeGeo = useMemo(
    () => curveGeometry(SCREEN.size[0] * 0.97, SCREEN.size[1] * 0.97, SCREEN.bend),
    []
  )
  const glassGeo = useMemo(
    () => curveGeometry(SCREEN.size[0], SCREEN.size[1], SCREEN.bend + 0.008),
    []
  )
  const wellGeo = useMemo(
    () => curveGeometry(SCREEN.size[0] * 1.04, SCREEN.size[1] * 1.04, SCREEN.bend * 0.4),
    []
  )

  return (
    <group scale={CRT_SCALE} position={[0, CRT_LIFT, 0]} rotation={[0, CRT_YAW, 0]}>
      <primitive object={cloned} />
      <mesh
        geometry={wellGeo}
        position={[SCREEN.position[0], SCREEN.position[1], SCREEN.position[2] - 0.018]}
      >
        <meshBasicMaterial color="#070503" />
      </mesh>
      <mesh
        geometry={tubeGeo}
        position={SCREEN.position}
        renderOrder={2}
      >
        <meshStandardMaterial
          map={bootMap}
          emissiveMap={bootMap}
          emissive={new THREE.Color('#ffb000')}
          emissiveIntensity={1.15}
          alphaMap={mask}
          transparent
          depthWrite
          toneMapped={false}
          roughness={0.55}
          metalness={0}
          polygonOffset
          polygonOffsetFactor={-2}
        />
      </mesh>
      <mesh
        geometry={glassGeo}
        position={[SCREEN.position[0], SCREEN.position[1], SCREEN.position[2] + 0.01]}
        renderOrder={3}
      >
        <meshBasicMaterial
          map={sheen}
          alphaMap={mask}
          transparent
          opacity={0.14}
          depthWrite={false}
          toneMapped={false}
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
      tex.repeat.set(2.4, 1.5)
      tex.anisotropy = 8
    })
    albedo.colorSpace = THREE.SRGBColorSpace
  }, [albedo, normal, rough])

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.22]} receiveShadow>
        <planeGeometry args={[3.6, 2.2]} />
        <meshStandardMaterial
          map={albedo}
          normalMap={normal}
          roughnessMap={rough}
          color="#2a160e"
          roughness={0.78}
          metalness={0.02}
          envMapIntensity={0.05}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.014, 0.22]} receiveShadow>
        <planeGeometry args={[9, 7]} />
        <meshStandardMaterial color="#100c09" roughness={0.97} envMapIntensity={0.04} />
      </mesh>
    </group>
  )
}

function NightRoom() {
  const albedo = useTexture('/assets/scene/painted_plaster_wall_diff_1k.webp')
  const city = useTexture('/assets/scene/modern_buildings_night.webp')
  useEffect(() => {
    albedo.wrapS = albedo.wrapT = THREE.RepeatWrapping
    albedo.repeat.set(2.0, 1.3)
    albedo.anisotropy = 4
    albedo.colorSpace = THREE.SRGBColorSpace
    city.colorSpace = THREE.SRGBColorSpace
  }, [albedo, city])

  return (
    <group>
      <mesh position={[0, 1.12, -1.32]} receiveShadow>
        <planeGeometry args={[5.2, 2.5]} />
        <meshBasicMaterial map={albedo} color="#3a4250" />
      </mesh>
      <mesh position={[-1.28, 1.12, 0.16]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[3.2, 2.5]} />
        <meshBasicMaterial map={albedo} color="#323844" />
      </mesh>
      <mesh position={[1.72, 1.12, 0.16]} rotation={[0, -Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[3.2, 2.5]} />
        <meshBasicMaterial map={albedo} color="#222830" />
      </mesh>
      <mesh position={[0, 2.28, 0.12]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[6.8, 4.6]} />
        <meshStandardMaterial color="#0a0c10" roughness={1} />
      </mesh>

      <group position={[-1.265, 0.88, 0.12]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[0, 0, -0.02]}>
          <planeGeometry args={[1.72, 1.42]} />
          <meshBasicMaterial map={city} color="#d4e8ff" toneMapped={false} />
        </mesh>
        <mesh>
          <planeGeometry args={[1.72, 1.42]} />
          <meshBasicMaterial color="#8fb4c9" transparent opacity={0.08} toneMapped={false} />
        </mesh>
        {[
          [0, 0.73, 0.02, 1.84, 0.055, 0.045],
          [0, -0.73, 0.02, 1.84, 0.055, 0.045],
          [-0.88, 0, 0.02, 0.055, 1.52, 0.045],
          [0.88, 0, 0.02, 0.055, 1.52, 0.045],
          [0, 0, 0.018, 0.03, 1.42, 0.02],
        ].map(([x, y, z, w, h, d], i) => (
          <mesh key={i} position={[x, y, z]}>
            <boxGeometry args={[w, h, d]} />
            <meshStandardMaterial color="#161b24" roughness={0.72} />
          </mesh>
        ))}
      </group>

      {[-0.48, 0.22, 0.9].map((x, i) => (
        <group key={x} position={[x, 1.34, -1.24]}>
          <mesh castShadow>
            <boxGeometry args={[0.64, 0.036, 0.16]} />
            <meshStandardMaterial color="#2a1f16" roughness={0.88} />
          </mesh>
          <mesh position={[-0.16, 0.15, 0]} castShadow>
            <boxGeometry args={[0.17, 0.26, 0.11]} />
            <meshStandardMaterial color={i === 1 ? '#3c2a1c' : '#1c2430'} roughness={0.8} />
          </mesh>
          <mesh position={[0.14, 0.11, 0]} castShadow>
            <boxGeometry args={[0.15, 0.18, 0.09]} />
            <meshStandardMaterial color="#241c14" roughness={0.84} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Keyboard() {
  const { scene } = useGLTF('/assets/scene/home_computer_keyboard.glb')
  const cloned = useMemo(() => scene.clone(true), [scene])
  useLayoutEffect(() => {
    cloned.traverse((obj) => {
      if (!obj.isMesh) return
      obj.castShadow = true
      obj.receiveShadow = true
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
      mats.forEach((mat) => {
        mat.envMapIntensity = 0.28
        mat.roughness = Math.min((mat.roughness ?? 0.5) + 0.1, 0.8)
        if (mat.color) mat.color.multiply(new THREE.Color('#eee0c4'))
      })
    })
  }, [cloned])
  const scale = 0.4
  return (
    <group scale={scale} position={[0.07, 0.171 * scale, 0.5]} rotation={[0, CRT_YAW, 0]}>
      <primitive object={cloned} />
    </group>
  )
}

function Dust() {
  const ref = useRef()
  const positions = useMemo(() => {
    const arr = new Float32Array(110 * 3)
    for (let i = 0; i < 110; i += 1) {
      arr[i * 3] = (Math.random() - 0.55) * 3.2
      arr[i * 3 + 1] = 0.12 + Math.random() * 1.45
      arr[i * 3 + 2] = (Math.random() - 0.3) * 2.4
    }
    return arr
  }, [])
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = clock.elapsedTime * 0.01
  })
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#8aa0b4" size={0.007} transparent opacity={0.14} depthWrite={false} />
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

function Scene({ zoomRef, bootRunning, reducedMotion, enableDof }) {
  const bootMap = useBootTexture({ running: bootRunning, reduced: reducedMotion })
  const { scene } = useThree()

  useEffect(() => {
    scene.background = new THREE.Color('#0b0e13')
  }, [scene])

  return (
    <>
      <color attach="background" args={['#0b0e13']} />
      <fog attach="fog" args={['#0b0e13', 6.2, 14]} />
      <SoftShadows size={14} samples={8} focus={0.55} />
      <hemisphereLight args={['#5a6c7a', '#1c120c', 0.05]} />
      <spotLight
        position={[-1.1, 1.35, 0.2]}
        angle={0.5}
        penumbra={0.88}
        intensity={0.85}
        color="#8fb4c9"
        distance={4.6}
        decay={2}
        castShadow
      />
      <spotLight
        position={[-0.2, 1.55, -0.6]}
        angle={0.7}
        penumbra={0.9}
        intensity={0.28}
        color="#7f8ea0"
        distance={5}
        decay={2}
      />
      <spotLight
        position={[0.92, 0.38, 0.54]}
        angle={0.62}
        penumbra={0.92}
        intensity={0.28}
        color="#c47e24"
        distance={1.8}
        decay={2}
      />
      <ambientLight intensity={0.06} color="#4a5560" />
      <NightEnv />
      <NightRoom />
      <Desk />
      <VintageCRT bootMap={bootMap} />
      <Keyboard />
      <ContactShadows position={[0, 0.001, 0.16]} opacity={0.7} scale={3.6} blur={2.2} far={1.2} color="#000" />
      <Dust />
      <CameraRig zoomRef={zoomRef} />
      <EffectComposer disableNormalPass multisampling={0}>
        <Bloom intensity={0.12} luminanceThreshold={0.88} mipmapBlur />
        {enableDof && (
          <DepthOfField
            focusDistance={0.016}
            focalLength={0.012}
            bokehScale={1.15}
          />
        )}
        <Noise opacity={0.018} />
        <Vignette offset={0.28} darkness={0.55} />
      </EffectComposer>
    </>
  )
}

export default function CRTScene({
  zoomRef,
  onReady,
  onProgress,
  bootRunning,
  reducedMotion,
  revealed,
  enableDof,
}) {
  return (
    <div className={`scene-layer scene-canvas ${revealed ? 'is-ready' : ''}`}>
      <Canvas
        dpr={[1, 1.5]}
        shadows
        gl={{
          antialias: true,
          alpha: false,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.92,
          outputColorSpace: THREE.SRGBColorSpace,
        }}
        camera={{ position: START_CAM.pos, fov: START_CAM.fov }}
      >
        <LoadBridge onProgress={onProgress} onReady={onReady} />
        <Scene
          zoomRef={zoomRef}
          bootRunning={bootRunning}
          reducedMotion={reducedMotion}
          enableDof={enableDof}
        />
      </Canvas>
    </div>
  )
}
