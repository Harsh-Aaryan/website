import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useGLTF, useProgress } from '@react-three/drei'
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { bindContextLoss, createSafeRenderer } from '../glSafe'
import { useBootTexture } from './ScreenBoot'

const TV_SCALE = 1.55
const PHONE_YAW = 0.06
const START_CAM = { pos: [0.68, 0.48, 1.42], look: [0.0, 0.28, 0.02], fov: 30 }
const END_FOV = 26
const GLASS_LOOK = [0.0, 0.45, 0.22]
const GLASS_OPEN = 0.82
const GLASS_PLANE = [0.312, 0.226]
const PHONE_GLASS_FILL = 0.88
const PHONE_TV_FILL = 0.87
const PHONE_GLB = '/assets/scene/r2/television_02_1k.glb'

function glassWorldSize(plane = GLASS_PLANE) {
  return [plane[0] * GLASS_OPEN * TV_SCALE, plane[1] * GLASS_OPEN * TV_SCALE]
}

function startCamForAspect(aspect, look = START_CAM.look, glassSize) {
  const safe = Math.max(0.42, aspect)
  const [gw] = glassSize?.[0] ? glassSize : glassWorldSize()
  const tvW = gw / (GLASS_OPEN * 0.78)
  const fov = Math.min(46, START_CAM.fov * (1.35 / safe))
  const tanHalf = Math.tan((fov * Math.PI) / 360)
  const dist = tvW / (2 * tanHalf * safe * PHONE_TV_FILL)
  return {
    pos: [look[0], look[1] + 0.26, look[2] + dist],
    look: [look[0], look[1] - 0.26, look[2] + 0.04],
    fov,
  }
}

function endCamForAspect(aspect, look, glassSize) {
  const safe = Math.max(0.42, aspect)
  const half = (END_FOV * Math.PI) / 360
  const fov = safe >= 1 ? END_FOV : Math.min(52, (2 * Math.atan(Math.tan(half) / safe) * 180) / Math.PI)
  const [gw] = glassSize?.[0] ? glassSize : glassWorldSize()
  const tanHalf = Math.tan((fov * Math.PI) / 360)
  const dist = gw / (2 * tanHalf * safe * PHONE_GLASS_FILL)
  return {
    pos: [look[0], look[1], look[2] + dist],
    look,
    fov,
  }
}

function yawAtZoom(t) {
  const s = Math.min(1, Math.max(0, (t - 0.55) / 0.35))
  const e = s * s * (3 - 2 * s)
  return PHONE_YAW * (1 - e)
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function lerp3(a, b, t) {
  return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]
}

function curveGeometry(width, height, bend = 0.012) {
  const geo = new THREE.PlaneGeometry(width, height, 24, 18)
  const pos = geo.attributes.position
  for (let i = 0; i < pos.count; i += 1) {
    const x = pos.getX(i) / width
    const y = pos.getY(i) / height
    pos.setZ(i, -bend * (x * x + y * y * 0.55))
  }
  geo.computeVertexNormals()
  return geo
}

function ShaderWarmup({ zoomRef, glassCenterRef, glassSizeRef, bootMap, onWarmed }) {
  const { gl, scene, camera, size } = useThree()
  const { active, progress, loaded } = useProgress()
  const warmed = useRef(false)
  const born = useRef(performance.now())

  useFrame(() => {
    if (warmed.current) return
    const waited = performance.now() - born.current
    const assetsIn = !active && loaded > 0 && progress >= 99
    if (!assetsIn && waited < 8000) return
    if (!glassSizeRef?.current?.[0] && waited < 8000) return
    warmed.current = true
    const saved = zoomRef.current
    const aspect = size.width / Math.max(1, size.height)
    try {
      if (bootMap && typeof gl.initTexture === 'function') gl.initTexture(bootMap)
      for (const t of [0, 1]) {
        zoomRef.current = t
        const lookEnd = glassCenterRef?.current || GLASS_LOOK
        const start = startCamForAspect(aspect, lookEnd, glassSizeRef.current)
        const end = endCamForAspect(aspect, lookEnd, glassSizeRef.current)
        const pos = lerp3(start.pos, end.pos, t)
        const look = lerp3(start.look, end.look, t)
        camera.position.set(pos[0], pos[1], pos[2])
        camera.fov = lerp(start.fov, end.fov, t)
        camera.lookAt(look[0], look[1], look[2])
        camera.updateProjectionMatrix()
        gl.compile(scene, camera)
        gl.render(scene, camera)
      }
    } catch {
      /* context may already be gone */
    }
    zoomRef.current = saved
    window.__crtWarmed = true
    onWarmed?.()
  })

  return null
}

function CameraRig({ zoomRef, glassCenterRef, glassSizeRef }) {
  const { camera, size } = useThree()
  const aspect = size.width / Math.max(1, size.height)

  useFrame(() => {
    const t = zoomRef?.current ?? 0
    const lookEnd = glassCenterRef?.current || GLASS_LOOK
    const glass = glassSizeRef?.current
    const start = startCamForAspect(aspect, lookEnd, glass)
    const end = endCamForAspect(aspect, lookEnd, glass)
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
    for (let i = 0; i < 4; i += 1) {
      const point = corners[i]
      group.current.localToWorld(point)
      point.project(camera)
      const x = (point.x * 0.5 + 0.5) * size.width
      const y = (-point.y * 0.5 + 0.5) * size.height
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }
    const phw = hw * GLASS_OPEN
    const phh = hh * GLASS_OPEN
    const phosphorLocal = [
      [-phw, -phh],
      [phw, -phh],
      [phw, phh],
      [-phw, phh],
    ]
    const phosphor = phosphorLocal.map(([lx, ly], i) => {
      const p = corners[4 + i]
      p.set(lx, ly, 0)
      group.current.localToWorld(p)
      p.project(camera)
      return {
        x: (p.x * 0.5 + 0.5) * size.width,
        y: (-p.y * 0.5 + 0.5) * size.height,
      }
    })
    const [bl, br, tr, tl] = phosphor
    const innerLeft = Math.max(tl.x, bl.x)
    const innerRight = Math.min(tr.x, br.x)
    const innerTop = Math.max(tl.y, tr.y)
    const innerBottom = Math.min(bl.y, br.y)
    const visLeft = Math.max(0, minX)
    const visRight = Math.min(size.width, maxX)
    onRectRef.current({
      left: minX,
      top: minY,
      width: maxX - minX,
      height: maxY - minY,
      widthPct: ((maxX - minX) / size.width) * 100,
      visibleWidthPct: ((visRight - visLeft) / size.width) * 100,
      screen: {
        left: innerLeft,
        top: innerTop,
        width: Math.max(1, innerRight - innerLeft),
        height: Math.max(1, innerBottom - innerTop),
      },
    })
  })

  return <group ref={group} position={screen.position} />
}

function VintageCRT({ bootMap, onGlassRect, zoomRef, glassCenterRef, glassSizeRef, onFootprint }) {
  const group = useRef()
  const { scene } = useGLTF(PHONE_GLB, false, true)
  const clone = useMemo(() => scene.clone(true), [scene])
  const [screen, setScreen] = useState({
    position: [0, 0.29, 0.145],
    size: [0.312, 0.226],
  })

  useFrame(() => {
    const yaw = yawAtZoom(zoomRef?.current ?? 0)
    if (group.current) group.current.rotation.y = yaw
    if (glassCenterRef) {
      glassCenterRef.current = [
        screen.position[0] * TV_SCALE,
        screen.position[1] * TV_SCALE,
        screen.position[2] * TV_SCALE,
      ]
    }
    if (glassSizeRef) glassSizeRef.current = glassWorldSize(screen.size)
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
      obj.castShadow = false
      obj.receiveShadow = false
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
      mats.forEach((mat) => {
        mat.envMapIntensity = 0
        mat.roughness = Math.min((mat.roughness ?? 0.5) + 0.08, 0.78)
        if (mat.color) mat.color.multiply(new THREE.Color(1.22, 1.1, 0.92))
      })
    })
    const box = new THREE.Box3().setFromObject(clone)
    const size = new THREE.Vector3()
    const center = new THREE.Vector3()
    box.getSize(size)
    box.getCenter(center)
    onFootprint?.([size.x * TV_SCALE, size.z * TV_SCALE])
    setScreen({
      position: [center.x, center.y + size.y * 0.145, box.max.z + 0.024],
      size: [size.x * 0.78, size.y * 0.55],
    })
  }, [clone, onFootprint])

  const glassGeo = useMemo(() => curveGeometry(screen.size[0], screen.size[1], 0.012), [screen.size])
  const tubeGeo = useMemo(
    () => curveGeometry(screen.size[0] * 0.96, screen.size[1] * 0.96, 0.01),
    [screen.size]
  )

  return (
    <group ref={group} scale={TV_SCALE} position={[0, 0, 0]} rotation={[0, PHONE_YAW, 0]}>
      <primitive object={clone} />
      <mesh geometry={tubeGeo} position={[screen.position[0], screen.position[1], screen.position[2] - 0.004]}>
        <meshBasicMaterial color="#0E0A05" />
      </mesh>
      <mesh geometry={tubeGeo} position={screen.position} renderOrder={2}>
        <meshBasicMaterial
          map={bootMap}
          color="#ffb000"
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
        <meshBasicMaterial color="#1a1410" transparent opacity={0.05} depthWrite={false} />
      </mesh>
      <GlassTracker screen={screen} onRect={onGlassRect} />
    </group>
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

function FpsGuard({ active, onFrame }) {
  const { gl } = useThree()
  const last = useRef(0)
  const armedAt = useRef(0)
  const lastTex = useRef(-1)
  const lastProg = useRef(-1)
  const skipN = useRef(0)
  const onFrameRef = useRef(onFrame)
  onFrameRef.current = onFrame

  useFrame(() => {
    const now = performance.now()
    if (!active) {
      last.current = 0
      armedAt.current = 0
      return
    }
    if (!armedAt.current) armedAt.current = now
    let tex = 0
    let prog = 0
    try {
      tex = gl.info?.memory?.textures ?? 0
      prog = gl.info?.programs?.length ?? 0
    } catch {
      last.current = now
      return
    }
    if (tex !== lastTex.current || prog !== lastProg.current) {
      lastTex.current = tex
      lastProg.current = prog
      skipN.current = 2
    }
    if (!window.__crtWarmed || now - armedAt.current < 300 || skipN.current > 0) {
      if (skipN.current > 0) skipN.current -= 1
      last.current = now
      return
    }
    if (last.current) {
      const dt = now - last.current
      if (dt > 0 && dt < 250) {
        window.__crtFps = Math.round(1000 / dt)
        onFrameRef.current?.(dt)
      }
    }
    last.current = now
  })

  return null
}

function makeSoftShadowMap() {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  const mid = size * 0.5
  const gradient = ctx.createRadialGradient(mid, mid, 0, mid, mid, size * 0.38)
  gradient.addColorStop(0, 'rgba(0,0,0,1)')
  gradient.addColorStop(0.4, 'rgba(0,0,0,0.5)')
  gradient.addColorStop(0.72, 'rgba(0,0,0,0.1)')
  gradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.clearRect(0, 0, size, size)
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.generateMipmaps = false
  tex.minFilter = THREE.LinearFilter
  tex.magFilter = THREE.LinearFilter
  tex.needsUpdate = true
  return tex
}

function SoftContactBlob({ size }) {
  const map = useMemo(() => makeSoftShadowMap(), [])
  useEffect(() => () => map.dispose(), [map])
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0.14]} renderOrder={0}>
      <planeGeometry args={[size[0] * 1.1, size[1] * 1.1]} />
      <meshBasicMaterial map={map} transparent opacity={0.45} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}

function StatsProbe() {
  const { gl } = useThree()
  useFrame(() => {
    window.__crtDraws = gl.info.render.calls
  })
  return null
}

function Scene({ zoomRef, bootRunning, reducedMotion, onBootReady, onGlassRect, onWarmed, fpsActive, onFrame }) {
  const glassCenterRef = useRef(GLASS_LOOK)
  const glassSizeRef = useRef(glassWorldSize())
  const [tvFoot, setTvFoot] = useState(null)
  const bootMap = useBootTexture({
    running: bootRunning,
    reduced: reducedMotion,
    onReady: onBootReady,
    scale: 1.4,
  })
  const { scene } = useThree()

  useEffect(() => {
    scene.background = new THREE.Color('#07090c')
  }, [scene])

  return (
    <>
      <color attach="background" args={['#07090c']} />
      <hemisphereLight args={['#7a8590', '#1a100c', 1.4]} />
      <ambientLight intensity={0.66} color="#8a7a64" />
      <directionalLight position={[0.15, 1.05, 1.55]} intensity={1.8} color="#f3d7a8" />
      <directionalLight position={[-0.8, 0.7, 0.4]} intensity={0.43} color="#7f93a3" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0.12]}>
        <planeGeometry args={[2.6, 1.7]} />
        <meshBasicMaterial color="#5a3820" />
      </mesh>
      {tvFoot && <SoftContactBlob size={tvFoot} />}
      <VintageCRT
        bootMap={bootMap}
        onGlassRect={onGlassRect}
        zoomRef={zoomRef}
        glassCenterRef={glassCenterRef}
        glassSizeRef={glassSizeRef}
        onFootprint={setTvFoot}
      />
      <CameraRig zoomRef={zoomRef} glassCenterRef={glassCenterRef} glassSizeRef={glassSizeRef} />
      <ShaderWarmup
        zoomRef={zoomRef}
        glassCenterRef={glassCenterRef}
        glassSizeRef={glassSizeRef}
        bootMap={bootMap}
        onWarmed={onWarmed}
      />
      <FpsGuard active={fpsActive} onFrame={onFrame} />
      <StatsProbe />
    </>
  )
}

export default function CRTSceneLite({
  zoomRef,
  onReady,
  onProgress,
  bootRunning,
  reducedMotion,
  revealed,
  onBootReady,
  onGlassRect,
  onContextLost,
  suspended,
  busy = true,
  fpsActive = false,
  onFrame,
}) {
  const [warmed, setWarmed] = useState(false)
  const idle = !busy && warmed && !suspended
  return (
    <div className={`scene-layer scene-canvas ${revealed ? 'is-ready' : ''} is-lite`}>
      <Canvas
        frameloop={suspended ? 'never' : idle ? 'demand' : 'always'}
        dpr={[1, 1.5]}
        shadows={false}
        gl={(canvas) =>
          createSafeRenderer(THREE, canvas, {
            antialias: false,
            alpha: false,
            powerPreference: 'low-power',
            toneMapping: THREE.ACESFilmicToneMapping,
            toneMappingExposure: 1.02,
            outputColorSpace: THREE.SRGBColorSpace,
          })
        }
        camera={{ position: START_CAM.pos, fov: START_CAM.fov }}
        onCreated={({ gl }) => {
          bindContextLoss(gl, onContextLost)
        }}
      >
        <LoadBridge onProgress={onProgress} onReady={onReady} />
        <Scene
          zoomRef={zoomRef}
          bootRunning={bootRunning}
          reducedMotion={reducedMotion}
          onBootReady={onBootReady}
          onGlassRect={onGlassRect}
          onWarmed={() => setWarmed(true)}
          fpsActive={Boolean(fpsActive && !suspended)}
          onFrame={onFrame}
        />
      </Canvas>
    </div>
  )
}
