import React, { Component, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import {
  STORAGE,
  TIMING,
  applyTheme,
  isPhoneLike,
  prefersReducedMotion,
  shouldUse3D,
} from './config'
import BootScreen from './components/BootScreen'
import FlatCRT from './components/FlatCRT'
import LoadingScreen from './components/LoadingScreen'
import OperatingSystem from './components/OperatingSystem'
import { useCrtAudio } from './hooks/useCrtAudio'

function readStored(key, fallback) {
  try {
    const value = localStorage.getItem(key)
    return value == null ? fallback : value
  } catch {
    return fallback
  }
}

function readZoomParam() {
  const value = Number(new URLSearchParams(window.location.search).get('z'))
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : null
}

function easeInOut(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2
}

function smoothstep(t) {
  const x = Math.min(1, Math.max(0, t))
  return x * x * (3 - 2 * x)
}

function visibleGlassRect(rect) {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const left = Math.max(0, rect.left)
  const top = Math.max(0, rect.top)
  const right = Math.min(vw, rect.left + rect.width)
  const bottom = Math.min(vh, rect.top + rect.height)
  return {
    left,
    top,
    width: Math.max(1, right - left),
    height: Math.max(1, bottom - top),
  }
}

function glassBox(rect) {
  if (rect?.screen) return visibleGlassRect(rect.screen)
  return visibleGlassRect(rect)
}

function lerpNum(a, b, t) {
  return a + (b - a) * t
}

function fullBezelBox() {
  const inset = window.innerWidth <= 768 ? 10 : 0
  return {
    left: inset,
    top: inset,
    width: Math.max(1, window.innerWidth - inset * 2),
    height: Math.max(1, window.innerHeight - inset * 2),
  }
}

function fadeLiteCanvas(amount) {
  const canvas = document.querySelector('.scene-canvas.is-lite')
  if (!canvas) return
  canvas.style.transition = 'none'
  canvas.style.opacity = String(Math.max(0, Math.min(1, 1 - amount)))
}

function applyFullBezel(el) {
  el.style.left = ''
  el.style.top = ''
  el.style.width = ''
  el.style.height = ''
  el.style.clipPath = 'none'
  el.style.opacity = '1'
  el.style.borderRadius = ''
  el.style.borderWidth = ''
  el.style.borderStyle = ''
  el.style.borderColor = ''
  el.style.boxSizing = ''
  el.classList.remove('is-wiping', 'is-expanding')
  el.classList.add('is-full')
  fadeLiteCanvas(1)
}

function applyOverlayRect(el, rect, zoom, expand = false) {
  if (!el) return
  const expandT = expand ? smoothstep((zoom - 0.85) / 0.15) : 0
  fadeLiteCanvas(expand ? expandT : 0)
  if (expand && zoom >= 0.995) {
    applyFullBezel(el)
    return
  }
  if (!rect) return
  const glass = glassBox(rect)
  const dest = fullBezelBox()
  const box =
    expandT > 0
      ? {
          left: lerpNum(glass.left, dest.left, expandT),
          top: lerpNum(glass.top, dest.top, expandT),
          width: lerpNum(glass.width, dest.width, expandT),
          height: lerpNum(glass.height, dest.height, expandT),
        }
      : glass
  const wipe = expand ? Math.max(expandT, smoothstep((zoom - 0.85) / 0.06)) : smoothstep((zoom - 0.9) / 0.1)
  el.style.boxSizing = 'border-box'
  el.style.left = `${box.left}px`
  el.style.top = `${box.top}px`
  el.style.width = `${box.width}px`
  el.style.height = `${box.height}px`
  const rad = lerpNum(Math.max(6, Math.min(box.width, box.height) * 0.026), 8, expandT)
  el.style.borderRadius = `${rad.toFixed(1)}px`
  el.style.borderStyle = expand ? 'solid' : ''
  el.style.borderColor = expand ? '#c4b08a' : ''
  el.style.borderWidth = expand ? `${(expandT * 10).toFixed(2)}px` : ''
  const hidden = (1 - wipe) * 100
  el.style.clipPath = wipe >= 0.995 || expandT > 0.04 ? 'none' : `inset(0 0 ${hidden.toFixed(2)}% 0)`
  el.style.opacity = wipe > 0.02 || expandT > 0 ? '1' : '0'
  el.classList.toggle('is-framed', expandT < 0.995)
  el.classList.toggle('is-wiping', !expand && wipe > 0.02 && wipe < 0.995)
  el.classList.toggle('is-expanding', expand && expandT > 0 && expandT < 0.995)
  el.classList.toggle('is-full', false)
}

function zoomDuration(dir, fromStage, use3d, reduced, lite) {
  if (reduced) return 0
  if (!use3d) return TIMING.crossfadeMs
  if (lite) return TIMING.phoneZoomMs
  if (dir === 'parked') return TIMING.zoomOutMs
  if (fromStage === 'boot' || fromStage === 'loading') return TIMING.zoomMs
  return TIMING.zoomOutMs
}

const sceneImport = (() => {
  try {
    if (isPhoneLike()) return import('./components/CRTSceneLite')
    return import('./components/CRTScene')
  } catch {
    return import('./components/CRTScene')
  }
})()
const Scene3D = lazy(() => sceneImport)

class SceneGuard extends Component {
  constructor(props) {
    super(props)
    this.state = { failed: false }
  }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    this.props.onFail?.()
  }

  render() {
    if (this.state.failed) return null
    return this.props.children
  }
}

export default function App() {
  const skipStored = readStored(STORAGE.skipIntro, '') === '1'
  const reduced = prefersReducedMotion()
  const zoomParam = readZoomParam()
  const [use3d, setUse3d] = useState(() => shouldUse3D())
  const lite = use3d && isPhoneLike()
  const liteRef = useRef(lite)
  liteRef.current = lite
  const fpsTimes = useRef([])
  const fpsBad = useRef(0)
  const introZoom = useRef(true)
  const recordFps = useCallback((dt) => {
    if (dt >= 80) return
    fpsTimes.current.push(dt)
  }, [])
  const judgeFpsSamples = () => {
    const times = fpsTimes.current
    fpsTimes.current = []
    if (times.length < 8) return
    const sorted = times.slice().sort((a, b) => a - b)
    const p75 = sorted[Math.floor((sorted.length - 1) * 0.75)]
    const slow = times.filter((dt) => dt > 50).length
    if (p75 > 50 && slow / times.length >= 0.4) fpsBad.current += 1
    else fpsBad.current = 0
    window.__crtFpsJudge = { p75, count: times.length, slow, bad: fpsBad.current }
  }

  const [stage, setStage] = useState(() => {
    if (skipStored) return 'os'
    if (zoomParam != null && zoomParam > 0 && zoomParam < 1) return 'zooming'
    if (zoomParam === 1) return 'os'
    if (zoomParam === 0) return 'boot'
    return 'loading'
  })
  const [themeId, setThemeId] = useState(() => readStored(STORAGE.theme, 'amber'))
  const [muted, setMuted] = useState(() => readStored(STORAGE.muted, '1') !== '0')
  const [ready3d, setReady3d] = useState(() => !shouldUse3D())
  const [loadProgress, setLoadProgress] = useState(8)
  const [overlayOn, setOverlayOn] = useState(() => (zoomParam ?? (skipStored ? 1 : 0)) >= 0.9)
  const [osMounted, setOsMounted] = useState(() => skipStored || (zoomParam ?? 0) >= 0.9)
  const [live, setLive] = useState('')
  const zoomRef = useRef(skipStored ? 1 : zoomParam ?? 0)
  const overlayOnRef = useRef((zoomParam ?? (skipStored ? 1 : 0)) >= 0.9)
  const overlayRef = useRef(null)
  const glassRectRef = useRef(null)
  const zoomRaf = useRef(0)
  const welcomed = useRef(false)
  const pendingLand = useRef(false)
  const announceTimer = useRef(0)
  const stageRef = useRef(stage)
  const startButtonRef = useRef(null)
  const parkedRef = useRef(null)
  const use3dRef = useRef(use3d)
  const reducedRef = useRef(reduced)
  const beatRef = useRef(0)
  const doneTimer = useRef(0)
  const channelRef = useRef(null)
  const dying3d = useRef(false)
  const [sceneHeld, setSceneHeld] = useState(false)
  const motionRef = useRef({
    dir: null,
    from: 0,
    start: 0,
    duration: 0,
    running: false,
  })
  const requestZoomRef = useRef(() => {})
  use3dRef.current = use3d
  reducedRef.current = reduced
  stageRef.current = stage

  useCrtAudio(!muted && stage !== 'loading')

  useEffect(() => {
    applyTheme(themeId)
  }, [themeId])

  const announce = useCallback((message) => {
    setLive('')
    window.clearTimeout(announceTimer.current)
    announceTimer.current = window.setTimeout(() => setLive(message), 40)
  }, [])

  useEffect(() => {
    if (stage !== 'loading') return
    if (use3d && loadProgress < 92) {
      const fallback = window.setTimeout(() => setStage('boot'), 8000)
      return () => window.clearTimeout(fallback)
    }
    const timer = window.setTimeout(() => setStage('boot'), TIMING.loadingMinMs)
    return () => window.clearTimeout(timer)
  }, [loadProgress, stage, use3d])

  const persistSkip = () => {
    try {
      localStorage.setItem(STORAGE.skipIntro, '1')
    } catch {
      /* ignore */
    }
  }

  const goStage = useCallback((next) => {
    stageRef.current = next
    setStage(next)
  }, [])

  const publishDebug = useCallback(() => {
    const motion = motionRef.current
    const now = performance.now()
    const t = !motion.running
      ? stageRef.current === 'os' || stageRef.current === 'parked'
        ? 1
        : 0
      : motion.duration <= 0
        ? 1
        : Math.min(1, Math.max(0, (now - motion.start) / motion.duration))
    window.__crtDebug = {
      stage: stageRef.current,
      lock: stageRef.current === 'zooming',
      progress: zoomRef.current,
      t,
      target: motion.dir || stageRef.current,
      display: use3dRef.current ? '3d' : 'flat',
      running: Boolean(motion.running),
      lite: Boolean(use3dRef.current && isPhoneLike()),
      osFrame:
        use3dRef.current && isPhoneLike() && stageRef.current === 'os' ? 'bezel' : use3dRef.current ? 'glass' : 'flat',
      draws: window.__crtDraws ?? 0,
      fps: window.__crtFps ?? null,
    }
  }, [])

  const clearOverlayFrame = () => {
    const el = overlayRef.current
    if (!el) return
    el.style.left = ''
    el.style.top = ''
    el.style.width = ''
    el.style.height = ''
    el.style.clipPath = 'none'
    el.style.opacity = '1'
    el.style.borderRadius = ''
    el.classList.remove('is-crossfade')
  }

  const stopPump = () => {
    cancelAnimationFrame(zoomRaf.current)
    window.clearInterval(beatRef.current)
    window.clearTimeout(doneTimer.current)
    zoomRaf.current = 0
    beatRef.current = 0
    doneTimer.current = 0
    if (channelRef.current) {
      try {
        channelRef.current.port1.onmessage = null
        channelRef.current.port1.close()
        channelRef.current.port2.close()
      } catch {
        /* ignore */
      }
      channelRef.current = null
    }
  }

  const landOnOs = useCallback(() => {
    if (!pendingLand.current) return
    pendingLand.current = false
    welcomed.current = true
    announce('HARSH.OS')
    const focus = () => startButtonRef.current?.focus()
    window.requestAnimationFrame(() => {
      focus()
      window.setTimeout(focus, 80)
    })
  }, [announce])

  const applyMotionFrame = (t) => {
    const motion = motionRef.current
    const eased = easeInOut(t)
    if (motion.dir === 'os') {
      zoomRef.current = motion.from + (1 - motion.from) * eased
    } else {
      zoomRef.current = motion.from * (1 - eased)
    }

    const el = overlayRef.current
    if (!use3dRef.current || reducedRef.current) {
      if (el) {
        el.classList.add('is-crossfade')
        el.style.opacity = String(motion.dir === 'os' ? t : 1 - t)
      }
      return
    }
    const appearAt = liteRef.current ? 0.85 : 0.9
    if (motion.dir === 'os' && zoomRef.current >= appearAt && !overlayOnRef.current) {
      overlayOnRef.current = true
      setOsMounted(true)
      setOverlayOn(true)
    }
    if (motion.dir === 'parked' && zoomRef.current < appearAt) overlayOnRef.current = true
    applyOverlayRect(el, glassRectRef.current, zoomRef.current, liteRef.current)
  }

  const finishMotion = useCallback(
    (dir) => {
      const target = dir || motionRef.current.dir
      motionRef.current.running = false
      motionRef.current.dir = null
      stopPump()
      const el = overlayRef.current
      if (el) el.classList.remove('is-crossfade')

      if (target === 'parked') {
        zoomRef.current = 0
        overlayOnRef.current = false
        if (el && !use3dRef.current) el.style.opacity = '1'
        goStage('parked')
        publishDebug()
        setOverlayOn(false)
        setOsMounted(true)
        fadeLiteCanvas(0)
        window.setTimeout(() => parkedRef.current?.focus(), 40)
        judgeFpsSamples()
        return
      }

      zoomRef.current = 1
      overlayOnRef.current = true
      persistSkip()
      if (el && !use3dRef.current) el.style.opacity = '1'
      if (el && liteRef.current) applyFullBezel(el)
      pendingLand.current = true
      goStage('os')
      publishDebug()
      setOverlayOn(true)
      setOsMounted(true)
      landOnOs()
      if (introZoom.current) {
        introZoom.current = false
        fpsTimes.current = []
      } else {
        judgeFpsSamples()
      }
    },
    [goStage, landOnOs, publishDebug]
  )

  const advanceZoom = useCallback(() => {
    const motion = motionRef.current
    if (!motion.running) {
      publishDebug()
      return true
    }
    const now = performance.now()
    const t = motion.duration <= 0 ? 1 : Math.min(1, (now - motion.start) / motion.duration)
    applyMotionFrame(t)
    publishDebug()
    if (t >= 1) {
      finishMotion(motion.dir)
      return true
    }
    return false
  }, [finishMotion, publishDebug])

  const pumpZoom = useCallback(() => {
    stopPump()
    if (advanceZoom()) return
    const step = () => {
      if (advanceZoom()) return
      zoomRaf.current = window.requestAnimationFrame(step)
    }
    zoomRaf.current = window.requestAnimationFrame(step)
    beatRef.current = window.setInterval(() => {
      advanceZoom()
    }, 16)
    const channel = new MessageChannel()
    channelRef.current = channel
    channel.port1.onmessage = () => {
      advanceZoom()
    }
    try {
      channel.port2.postMessage(0)
    } catch {
      /* ignore */
    }
    const remain = Math.max(0, motionRef.current.duration - (performance.now() - motionRef.current.start))
    doneTimer.current = window.setTimeout(() => {
      advanceZoom()
    }, remain)
  }, [advanceZoom])

  const beginZoom = useCallback(
    (dir) => {
      const fromStage = stageRef.current
      const from = zoomRef.current
      const duration = zoomDuration(dir, fromStage, use3dRef.current, reducedRef.current, liteRef.current)
      fpsTimes.current = []
      motionRef.current = {
        dir,
        from,
        start: performance.now(),
        duration,
        running: true,
      }
      goStage('zooming')
      if (!liteRef.current) setOsMounted(true)
      if (dir === 'parked' && !liteRef.current) {
        announce('Zoomed out to monitor. Press any key to return.')
      }
      if (dir === 'parked' && liteRef.current) {
        window.setTimeout(() => announce('Zoomed out to monitor. Press any key to return.'), 0)
      }
      if (liteRef.current && use3dRef.current && !reducedRef.current) {
        publishDebug()
        advanceZoom()
        if (motionRef.current.running) pumpZoom()
        return
      }
      if (!use3dRef.current || reducedRef.current) {
        overlayOnRef.current = true
        setOverlayOn(true)
        const el = overlayRef.current
        if (el) {
          el.classList.add('is-crossfade')
          el.style.opacity = dir === 'os' ? '0' : '1'
        }
      }
      publishDebug()
      advanceZoom()
      if (motionRef.current.running) pumpZoom()
    },
    [advanceZoom, announce, goStage, publishDebug, pumpZoom]
  )

  const reverseMotion = useCallback(
    (dir) => {
      const motion = motionRef.current
      const now = performance.now()
      const current = zoomRef.current
      const remaining = dir === 'os' ? 1 - current : current
      const full = zoomDuration(dir, 'zooming', use3dRef.current, reducedRef.current, liteRef.current)
      motion.dir = dir
      motion.from = current
      motion.start = now
      motion.duration = full * Math.max(0.12, Math.min(1, remaining))
      motion.running = true
      if (dir === 'parked') {
        announce('Zoomed out to monitor. Press any key to return.')
      }
      const el = overlayRef.current
      if ((!use3dRef.current || reducedRef.current) && el) {
        el.classList.add('is-crossfade')
        overlayOnRef.current = true
        setOverlayOn(true)
      }
      publishDebug()
      advanceZoom()
      if (motion.running) pumpZoom()
    },
    [advanceZoom, announce, publishDebug, pumpZoom]
  )

  const requestZoom = useCallback(
    (dir) => {
      const motion = motionRef.current
      if (stageRef.current === 'zooming') {
        if (motion.running) {
          if (motion.dir && motion.dir !== dir) {
            reverseMotion(dir)
            return
          }
          advanceZoom()
          return
        }
        finishMotion(motion.dir || dir)
        if (stageRef.current === 'zooming') return
      }
      const now = stageRef.current
      if (dir === 'os') {
        if (now === 'os' || now === 'loading') return
        beginZoom('os')
        return
      }
      if (now === 'parked' || now === 'loading') return
      beginZoom('parked')
    },
    [advanceZoom, beginZoom, finishMotion, reverseMotion]
  )
  requestZoomRef.current = requestZoom

  const startZoom = useCallback(() => requestZoom('os'), [requestZoom])
  const startZoomOut = useCallback(() => requestZoom('parked'), [requestZoom])

  const abandon3d = useCallback(() => {
    if (dying3d.current && !use3dRef.current) {
      if (motionRef.current.running) advanceZoom()
      return
    }
    if (!use3dRef.current) {
      if (motionRef.current.running) advanceZoom()
      return
    }
    dying3d.current = true
    use3dRef.current = false
    window.__crtDebug = {
      ...(window.__crtDebug || {}),
      display: 'flat',
      lite: false,
      osFrame: 'flat',
    }
    setSceneHeld(true)
    const running = motionRef.current.running
    const target = motionRef.current.dir
    const now = stageRef.current
    const toOs =
      target === 'os' ||
      now === 'os' ||
      now === 'loading' ||
      now === 'boot' ||
      zoomRef.current >= 0.45
    stopPump()
    motionRef.current.running = false
    motionRef.current.dir = null
    publishDebug()
    const settle = () => {
      clearOverlayFrame()
      glassRectRef.current = null
      setUse3d(false)
      setSceneHeld(false)
      setReady3d(true)
      if (toOs || (running && target === 'os')) {
        pendingLand.current = true
        zoomRef.current = 1
        overlayOnRef.current = true
        setOverlayOn(true)
        setOsMounted(true)
        persistSkip()
        goStage('os')
        landOnOs()
      } else {
        zoomRef.current = 0
        overlayOnRef.current = false
        setOverlayOn(false)
        setOsMounted(true)
        goStage('parked')
      }
      publishDebug()
    }
    settle()
  }, [advanceZoom, goStage, landOnOs, publishDebug])

  useEffect(() => {
    if (!lite) return
    if (stage !== 'os' && stage !== 'parked') return
    if (fpsBad.current < 2) return
    abandon3d()
  }, [abandon3d, lite, stage])

  useEffect(() => {
    if (stage !== 'os') return
    if (!pendingLand.current && welcomed.current) return
    pendingLand.current = true
    landOnOs()
  }, [landOnOs, stage])

  useEffect(() => {
    publishDebug()
  }, [publishDebug, stage, use3d])

  useEffect(
    () => () => {
      stopPump()
      window.clearTimeout(announceTimer.current)
    },
    []
  )

  useEffect(() => {
    const sync = () => {
      if (shouldUse3D()) return
      if (use3dRef.current) abandon3d()
    }
    window.addEventListener('resize', sync)
    window.addEventListener('orientationchange', sync)
    return () => {
      window.removeEventListener('resize', sync)
      window.removeEventListener('orientationchange', sync)
    }
  }, [abandon3d])

  useEffect(() => {
    const onLost = (event) => {
      event.preventDefault()
      abandon3d()
    }
    const onErr = (event) => {
      const msg = event?.message || event?.error?.message || ''
      if (!/precision|WebGL|webgl|WEBGL|context lost|WEBGL_LOST/i.test(msg)) return
      event.preventDefault?.()
      abandon3d()
    }
    window.addEventListener('webglcontextlost', onLost, true)
    window.addEventListener('error', onErr)
    return () => {
      window.removeEventListener('webglcontextlost', onLost, true)
      window.removeEventListener('error', onErr)
    }
  }, [abandon3d])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'hidden') return
      if (stageRef.current !== 'zooming') return
      advanceZoom()
      if (motionRef.current.running) finishMotion(motionRef.current.dir)
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [advanceZoom, finishMotion])

  useEffect(() => {
    if (!use3d) return
    const id = window.setTimeout(() => {
      if (use3dRef.current && !glassRectRef.current) abandon3d()
    }, TIMING.zoomWatchMs)
    return () => window.clearTimeout(id)
  }, [abandon3d, use3d])

  useEffect(() => {
    if (!overlayOn && stage !== 'os') return
    applyOverlayRect(overlayRef.current, glassRectRef.current, zoomRef.current, liteRef.current)
  }, [overlayOn, stage])

  useEffect(() => {
    const onEsc = (event) => {
      if (event.key !== 'Escape') return
      if (stageRef.current !== 'zooming') return
      event.preventDefault()
      requestZoom('parked')
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [requestZoom])

  useEffect(() => {
    const ignore = (event) =>
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.key === 'Tab' ||
      event.key === 'Shift' ||
      event.key === 'Control' ||
      event.key === 'Alt' ||
      event.key === 'Meta' ||
      event.key === 'CapsLock' ||
      event.key === 'Escape'
    const go = (event) => {
      if (stageRef.current !== 'parked') return
      if (event.type === 'keydown' && ignore(event)) return
      startZoom()
    }
    window.addEventListener('keydown', go)
    window.addEventListener('pointerdown', go)
    return () => {
      window.removeEventListener('keydown', go)
      window.removeEventListener('pointerdown', go)
    }
  }, [startZoom])

  const skipIntro = () => {
    stopPump()
    motionRef.current.running = false
    motionRef.current.dir = null
    persistSkip()
    zoomRef.current = 1
    overlayOnRef.current = true
    setOverlayOn(true)
    setOsMounted(true)
    pendingLand.current = true
    goStage('os')
    if (liteRef.current && overlayRef.current) applyFullBezel(overlayRef.current)
    landOnOs()
    publishDebug()
  }

  const toggleTheme = () => {
    setThemeId((prev) => {
      const next = prev === 'amber' ? 'green' : 'amber'
      try {
        localStorage.setItem(STORAGE.theme, next)
      } catch {
        /* ignore */
      }
      return next
    })
  }

  const toggleMute = () => {
    setMuted((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE.muted, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }

  const osProps = {
    themeId,
    muted,
    onToggleTheme: toggleTheme,
    onToggleMute: toggleMute,
    onZoomOut: startZoomOut,
    startButtonRef,
  }

  const overlayVisible =
    osMounted &&
    stage !== 'parked' &&
    (overlayOn || stage === 'os' || (!use3d && stage === 'zooming'))
  const showSkip =
    !osMounted &&
    (stage === 'loading' || stage === 'boot' || stage === 'zooming') &&
    !overlayOn

  return (
    <main
      className="app"
      id="os-main"
      data-display={use3d ? '3d' : 'flat'}
      data-lite={lite ? '1' : '0'}
      data-stage={stage}
      data-lock={stage === 'zooming' ? '1' : '0'}
    >
      <a className="skip-link" href="#os-main">
        Skip to content
      </a>
      <div className="visually-hidden" aria-live="polite" aria-atomic="true">
        {live}
      </div>

      {use3d && (
        <>
          <div className="room-fallback" aria-hidden="true" />
          <Suspense fallback={<LoadingScreen progress={loadProgress} compact />}>
            <SceneGuard onFail={abandon3d}>
            <Scene3D
              zoomRef={zoomRef}
              onReady={() => setReady3d(true)}
              onProgress={setLoadProgress}
              bootRunning={stage === 'boot'}
              reducedMotion={reduced}
              revealed={ready3d || stage === 'os' || stage === 'parked'}
              enableDof={false}
              lite={lite}
              busy={
                stage === 'loading' ||
                stage === 'boot' ||
                stage === 'zooming' ||
                !ready3d
              }
              fpsActive={lite && (stage === 'boot' || stage === 'zooming')}
              onFrame={recordFps}
              suspended={sceneHeld}
              onContextLost={abandon3d}
              onBootReady={() => {
                fpsTimes.current = []
                startZoom()
              }}
              onGlassRect={(rect) => {
                glassRectRef.current = rect
                window.__glassMetrics = rect
                if (overlayVisible || overlayOnRef.current) {
                  applyOverlayRect(overlayRef.current, rect, zoomRef.current, liteRef.current)
                }
              }}
            />
            </SceneGuard>
          </Suspense>
        </>
      )}
      {stage === 'loading' && use3d && <LoadingScreen progress={loadProgress} compact />}

      {!use3d && (stage === 'loading' || stage === 'boot' || stage === 'zooming') && (
        <FlatCRT stage={stage}>
          {stage === 'loading' && <LoadingScreen progress={loadProgress} />}
          {stage === 'boot' && (
            <BootScreen
              running
              onReady={startZoom}
              reduced={reduced}
            />
          )}
        </FlatCRT>
      )}

      {osMounted && (
        <div
          ref={overlayRef}
          className={lite && stage === 'os' ? 'flat-os-bezel' : use3d ? 'screen-overlay is-framed' : 'flat-os-bezel'}
          hidden={use3d ? !overlayVisible : !(overlayVisible || stage === 'parked')}
        >
          <div hidden={!use3d && stage === 'parked'} style={{ height: '100%' }}>
            <OperatingSystem interactive={stage === 'os'} {...osProps} />
          </div>
          {!use3d && stage === 'parked' && (
            <BootScreen running={false} onReady={startZoom} reduced parked />
          )}
        </div>
      )}

      {use3d && (stage === 'parked' || stage === 'zooming') && !overlayVisible && (
        <button
          type="button"
          className="scene-recover"
          aria-label="Press any key to return to HARSH.OS"
          onPointerDown={(event) => {
            event.preventDefault()
            startZoom()
          }}
        >
          <span className="visually-hidden">Press any key to return to HARSH.OS</span>
        </button>
      )}

      {stage === 'parked' && (
        <button
          ref={parkedRef}
          type="button"
          className="visually-hidden"
          onPointerDown={(event) => {
            event.preventDefault()
            event.stopPropagation()
            startZoom()
          }}
        >
          Press any key to return to HARSH.OS
        </button>
      )}

      {showSkip && (
        <button type="button" className="skip-intro-btn" onClick={skipIntro}>
          SKIP INTRO
        </button>
      )}
    </main>
  )
}
