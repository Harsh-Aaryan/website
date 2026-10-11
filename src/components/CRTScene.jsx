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
import { ROOM } from '../config'
import { useBootTexture } from './ScreenBoot'

const TV_SCALE = 1.55
const START_CAM = { pos: [0.68, 0.48, 1.42], look: [0.0, 0.28, 0.02], fov: 30 }
const END_CAM = { pos: [0.01, 0.395, 0.40], look: [0.0, 0.385, 0.175], fov: 24 }

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
      new THREE.Vector3(-0.5, -0.5, 0),
      new THREE.Vector3(0.5, -0.5, 0),
      new THREE.Vector3(0.5, 0.5, 0),
      new THREE.Vector3(-0.5, 0.5, 0),
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
  const clone = useMemo(() => scene.clone(true), [scene])
  const [screen, setScreen] = useState({
    position: [0, 0.29, 0.145],
    size: [0.312, 0.226],
  })

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
    () => curveGeometry(screen.size[0], screen.size[1], 0.026),
    [screen.size]
  )

  return (
    <group scale={TV_SCALE} position={[0, 0, 0]} rotation={[0, 0.18, 0]}>
      <primitive object={clone} />
      <mesh
        ref={screenRef}
        geometry={glassGeo}
        position={screen.position}
        renderOrder={2}
      >
        <meshStandardMaterial
          map={bootMap}
          emissiveMap={bootMap}
          emissive={new THREE.Color('#ffb000')}
          emissiveIntensity={1.05}
          roughness={0.42}
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
          color="#d8e4ee"
          roughness={0.08}
          metalness={0.04}
          transparent
          opacity={0.11}
          clearcoat={0.85}
          clearcoatRoughness={0.22}
          envMapIntensity={1.35}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}

function Desk() {
  const [albedo, normal, rough] = useTexture([
    '/assets/scene/wood_table_worn_diff_1k.webp',
    '/assets/scene/wood_table_worn_nor_gl_1k.webp',
    '/assets/scene/wood_table_worn_rough_1k.webp',
  ])
  useEffect(() => {
    ;[albedo, normal, rough].forEach((tex) => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping
      tex.repeat.set(2.4, 1.4)
      tex.anisotropy = 8
    })
    albedo.colorSpace = THREE.SRGBColorSpace
  }, [albedo, normal, rough])

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.12]} receiveShadow>
      <planeGeometry args={[4.2, 2.4]} />
      <meshStandardMaterial
        map={albedo}
        normalMap={normal}
        roughnessMap={rough}
        roughness={0.84}
        metalness={0.02}
        envMapIntensity={0.28}
      />
    </mesh>
  )
}

function LoadBridge({ onProgress, onReady }) {
  const { progress } = useProgress()
  const readyRef = useRef(false)
  const onReadyRef = useRef(onReady)
  const onProgressRef = useRef(onProgress)
  onReadyRef.current = onReady
  onProgressRef.current = onProgress

  useEffect(() => {
    onProgressRef.current?.(progress)
    if (progress >= 99 && !readyRef.current) {
      readyRef.current = true
      onReadyRef.current?.()
    }
  }, [progress])

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (!readyRef.current) {
        readyRef.current = true
        onReadyRef.current?.()
      }
    }, 5000)
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
      <fog attach="fog" args={[ROOM.dark, 4.2, 10]} />
      <SoftShadows size={16} samples={8} focus={0.55} />
      <hemisphereLight args={['#7d9eb0', '#140e08', 0.08]} />
      <directionalLight
        position={[-2.4, 1.6, -0.55]}
        intensity={0.52}
        color="#8fb4c9"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={0.4}
        shadow-camera-far={8}
        shadow-camera-left={-2}
        shadow-camera-right={2}
        shadow-camera-top={2}
        shadow-camera-bottom={-2}
        shadow-bias={-0.0004}
      />
      <spotLight
        position={[0.02, 0.46, 0.22]}
        angle={0.95}
        penumbra={0.92}
        intensity={1.65}
        color="#ffb000"
        distance={2.6}
        decay={2}
        castShadow
      />
      <pointLight position={[0.08, 0.12, 0.38]} intensity={0.35} color="#e09a30" distance={1.6} decay={2} />
      <ambientLight intensity={0.08} color="#6d8294" />
      <Environment files="/assets/scene/moonless_golf_1k.hdr" environmentIntensity={0.3} background={false} />
      <mesh position={[0, 0.7, -1.8]} receiveShadow>
        <planeGeometry args={[14, 7]} />
        <meshStandardMaterial color="#0a0c10" roughness={0.96} />
      </mesh>
      <Desk />
      <VintageCRT screenRef={screenRef} bootMap={bootMap} />
      <ContactShadows position={[0, 0.001, 0.08]} opacity={0.5} scale={3.6} blur={2.2} far={1.2} color="#000" />
      <CameraRig zoom={zoom} screenRef={screenRef} onScreenRect={onScreenRect} />
      {zoom < 0.92 && (
        <EffectComposer disableNormalPass multisampling={0}>
          <Bloom intensity={0.16} luminanceThreshold={0.82} mipmapBlur />
          <DepthOfField
            focusDistance={0.014}
            focalLength={0.012}
            bokehScale={zoom > 0.25 ? 0.5 : 1.1}
          />
          <Noise opacity={0.022} />
          <Vignette offset={0.28} darkness={0.55} />
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
          toneMappingExposure: 0.92,
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
