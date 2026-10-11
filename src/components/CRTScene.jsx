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
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { useBootTexture } from './ScreenBoot'

const TV_SCALE = 1.55
const TV_YAW = 0.18

const START_CAM = { pos: [0.68, 0.48, 1.42], look: [0.0, 0.28, 0.02], fov: 30 }
const END_CAM = { pos: [0.0, 0.41, 0.76], look: [0.0, 0.41, 0.05], fov: 26 }

/** PerspectiveCamera.fov is vertical — pull back and widen on tall frames. */
function startCamForAspect(aspect) {
  const safe = Math.max(0.42, aspect)
  if (safe >= 1) return START_CAM
  return {
    pos: [0.22, START_CAM.pos[1], START_CAM.pos[2] + (safe < 0.75 ? 0.55 : 0.28)],
    look: START_CAM.look,
    fov: Math.min(48, START_CAM.fov * (1.45 / safe)),
  }
}

/** Keep ~26° of horizontal coverage on portrait so the BIOS left column stays in frame. */
function endCamForAspect(aspect) {
  const safe = Math.max(0.42, aspect)
  if (safe >= 1) return END_CAM
  const half = (END_CAM.fov * Math.PI) / 360
  const fov = Math.min(58, (2 * Math.atan(Math.tan(half) / safe) * 180) / Math.PI)
  return {
    pos: [END_CAM.pos[0], END_CAM.pos[1], END_CAM.pos[2] + 0.52],
    look: END_CAM.look,
    fov,
  }
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function lerp3(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

function curveGeometry(width, height, bend = 0.028) {
  const geo = new THREE.PlaneGeometry(width, height, 40, 30)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i) / width
    const y = pos.getY(i) / height
    pos.setZ(i, -bend * (x * x + y * y * 0.55))
  }
  geo.computeVertexNormals()
  return geo
}

function CameraRig({ zoomRef }) {
  const { camera, size } = useThree()
  const aspect = size.width / Math.max(1, size.height)
  const start = useMemo(() => startCamForAspect(aspect), [aspect])
  const end = useMemo(() => endCamForAspect(aspect), [aspect])

  useFrame(() => {
    const t = zoomRef?.current ?? 0
    const pos = lerp3(start.pos, end.pos, t)
    const look = lerp3(start.look, end.look, t)
    camera.position.set(pos[0], pos[1], pos[2])
    camera.fov = lerp(start.fov, end.fov, t)
    camera.lookAt(look[0], look[1], look[2])
    camera.updateProjectionMatrix()
  })

  return null
}

function GlassTracker({ screen, onRect }) {
  const group = useRef()
  const { camera, size } = useThree()
  const onRectRef = useRef(onRect)
  onRectRef.current = onRect
  const corners = useMemo(
    () => [
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
      new THREE.Vector3(),
    ],
    []
  )

  useFrame(() => {
    if (!group.current || !onRectRef.current) return
    group.current.updateWorldMatrix(true, false)
    const hw = screen.size[0] * 0.5
    const hh = screen.size[1] * 0.5
    corners[0].set(-hw, -hh, 0)
    corners[1].set(hw, -hh, 0)
    corners[2].set(hw, hh, 0)
    corners[3].set(-hw, hh, 0)
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const point of corners) {
      group.current.localToWorld(point)
      point.project(camera)
      const x = (point.x * 0.5 + 0.5) * size.width
      const y = (-point.y * 0.5 + 0.5) * size.height
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }
    const visLeft = Math.max(0, minX)
    const visRight = Math.min(size.width, maxX)
    onRectRef.current({
      left: minX,
      top: minY,
      width: maxX - minX,
      height: maxY - minY,
      widthPct: ((maxX - minX) / size.width) * 100,
      visibleWidthPct: ((visRight - visLeft) / size.width) * 100,
    })
  })

  return <group ref={group} position={screen.position} />
}

function NightEnv() {
  const tex = useTexture('/assets/scene/r1/unfinished_office_night_1k.jpg')
  useEffect(() => {
    tex.mapping = THREE.EquirectangularReflectionMapping
    tex.colorSpace = THREE.SRGBColorSpace
  }, [tex])
  return <Environment map={tex} environmentIntensity={0.3} background={false} />
}

function VintageCRT({ bootMap, onGlassRect }) {
  const { scene } = useGLTF('/assets/scene/r2/television_02.glb', false, true)
  const clone = useMemo(() => scene.clone(true), [scene])
  const [screen, setScreen] = useState({
    position: [0, 0.29, 0.145],
    size: [0.312, 0.226],
  })

  useLayoutEffect(() => {
    bootMap.wrapS = bootMap.wrapT = THREE.ClampToEdgeWrapping
    bootMap.repeat.set(1, 1)
    bootMap.offset.set(0, 0)
    bootMap.needsUpdate = true
  }, [bootMap])

  useLayoutEffect(() => {
    clone.traverse((obj) => {
      if (!obj.isMesh || !obj.material) return
      obj.castShadow = true
      obj.receiveShadow = true
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
      mats.forEach((mat) => {
        mat.envMapIntensity = 0.7
        mat.roughness = Math.min((mat.roughness ?? 0.42) + 0.1, 0.68)
        if (mat.color) mat.color.multiply(new THREE.Color(1.05, 0.97, 0.86))
      })
    })
    const box = new THREE.Box3().setFromObject(clone)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)
    setScreen({
      position: [center.x, center.y + size.y * 0.145, box.max.z + 0.024],
      size: [size.x * 0.78, size.y * 0.55],
    })
  }, [clone])

  const glassGeo = useMemo(
    () => curveGeometry(screen.size[0], screen.size[1], 0.012),
    [screen.size]
  )
  const tubeGeo = useMemo(
    () => curveGeometry(screen.size[0] * 0.96, screen.size[1] * 0.96, 0.01),
    [screen.size]
  )

  return (
    <group scale={TV_SCALE} position={[0, 0, 0]} rotation={[0, TV_YAW, 0]}>
      <primitive object={clone} />
      <mesh
        geometry={tubeGeo}
        position={[screen.position[0], screen.position[1], screen.position[2] - 0.004]}
      >
        <meshBasicMaterial color="#0E0A05" />
      </mesh>
      <mesh geometry={tubeGeo} position={screen.position} renderOrder={2}>
        <meshStandardMaterial
          color="#000000"
          emissive="#ffb000"
          emissiveMap={bootMap}
          emissiveIntensity={1}
          roughness={1}
          metalness={0}
          toneMapped={false}
          polygonOffset
          polygonOffsetFactor={-1}
          polygonOffsetUnits={-1}
        />
      </mesh>
      <mesh
        geometry={glassGeo}
        position={[screen.position[0], screen.position[1], screen.position[2] + 0.008]}
        renderOrder={3}
      >
        <meshPhysicalMaterial
          color="#1a1410"
          roughness={0.22}
          metalness={0}
          transparent
          opacity={0.04}
          clearcoat={0.4}
          clearcoatRoughness={0.45}
          envMapIntensity={0.1}
          depthWrite={false}
        />
      </mesh>
      <GlassTracker screen={screen} onRect={onGlassRect} />
    </group>
  )
}

function Desk() {
  const [albedo, normal, rough] = useTexture([
    '/assets/scene/r1/dark_wood_diff_1k.webp',
    '/assets/scene/r1/dark_wood_nor_gl_1k.webp',
    '/assets/scene/r1/dark_wood_rough_1k.webp',
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
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.12]} receiveShadow>
        <planeGeometry args={[4.2, 2.4]} />
        <meshStandardMaterial
          map={albedo}
          normalMap={normal}
          roughnessMap={rough}
          color="#2a160e"
          roughness={0.78}
          metalness={0.02}
          envMapIntensity={0.18}
        />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.014, 0.12]} receiveShadow>
        <planeGeometry args={[9, 7]} />
        <meshStandardMaterial color="#100c09" roughness={0.97} envMapIntensity={0.04} />
      </mesh>
    </group>
  )
}

function NightRoom() {
  const albedo = useTexture('/assets/scene/r1/painted_plaster_wall_diff_1k.webp')
  const city = useTexture('/assets/scene/r1/modern_buildings_night.webp')
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
          <meshBasicMaterial map={city} color="#1a2430" toneMapped={false} />
        </mesh>
        <mesh>
          <planeGeometry args={[1.72, 1.42]} />
          <meshBasicMaterial color="#070b10" transparent opacity={0.62} toneMapped={false} />
        </mesh>
        {[-0.52, -0.26, 0, 0.26, 0.52].map((y) => (
          <mesh key={y} position={[0, y, 0.01]}>
            <planeGeometry args={[1.72, 0.045]} />
            <meshBasicMaterial color="#0b0e14" transparent opacity={0.7} />
          </mesh>
        ))}
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
    }, 14000)
    return () => window.clearTimeout(id)
  }, [])

  return null
}

function WindowWash() {
  const light = useRef()
  const { scene } = useThree()
  useLayoutEffect(() => {
    const target = light.current?.target
    if (!target) return
    target.position.set(-1.35, 0.9, 0.05)
    scene.add(target)
    return () => scene.remove(target)
  }, [scene])
  return (
    <spotLight
      ref={light}
      position={[-1.55, 1.55, -0.35]}
      angle={0.42}
      penumbra={0.9}
      intensity={0.42}
      color="#6d8294"
      distance={3.8}
      decay={2}
      castShadow
    />
  )
}

function Scene({ zoomRef, bootRunning, reducedMotion, enableDof, onBootReady, onGlassRect }) {
  const bootMap = useBootTexture({
    running: bootRunning,
    reduced: reducedMotion,
    onReady: onBootReady,
  })
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
      <WindowWash />
      <spotLight
        position={[-0.35, 1.7, -0.85]}
        angle={0.55}
        penumbra={0.92}
        intensity={0.16}
        color="#5a6674"
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
      <VintageCRT bootMap={bootMap} onGlassRect={onGlassRect} />
      <ContactShadows position={[0, 0.001, 0.08]} opacity={0.55} scale={3.6} blur={2.2} far={1.2} color="#000" />
      <Dust />
      <CameraRig zoomRef={zoomRef} />
      <EffectComposer disableNormalPass multisampling={0}>
        <Bloom intensity={0.08} luminanceThreshold={0.92} mipmapBlur />
        {enableDof && (
          <DepthOfField
            focusDistance={0.014}
            focalLength={0.012}
            bokehScale={1.1}
          />
        )}
        <Noise opacity={0.018} />
          <Vignette offset={0.52} darkness={0.16} />
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
  onBootReady,
  onGlassRect,
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
          toneMappingExposure: 0.96,
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
          onBootReady={onBootReady}
          onGlassRect={onGlassRect}
        />
      </Canvas>
    </div>
  )
}
