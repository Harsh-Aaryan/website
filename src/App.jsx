import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import {
  STORAGE,
  TIMING,
  applyTheme,
  prefersReducedMotion,
  shouldUse3D,
} from './config'
import BootScreen from './components/BootScreen'
import FlatCRT from './components/FlatCRT'
import LoadingScreen from './components/LoadingScreen'
import OperatingSystem from './components/OperatingSystem'
import { useCrtAudio } from './hooks/useCrtAudio'

const CRTScene = lazy(() => import('./components/CRTScene'))

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

function applyOverlayRect(el, rect, zoom) {
  if (!el || !rect) return
  const box = glassBox(rect)
  const wipe = smoothstep((zoom - 0.9) / 0.1)
  el.style.left = `${box.left}px`
  el.style.top = `${box.top}px`
  el.style.width = `${box.width}px`
  el.style.height = `${box.height}px`
  const rad = Math.max(6, Math.min(box.width, box.height) * 0.026)
  el.style.borderRadius = `${rad.toFixed(1)}px`
  const hidden = (1 - wipe) * 100
  el.style.clipPath = wipe >= 0.995 ? 'none' : `inset(0 0 ${hidden.toFixed(2)}% 0)`
  el.style.opacity = wipe > 0.02 ? '1' : '0'
  el.classList.toggle('is-framed', true)
  el.classList.toggle('is-wiping', wipe > 0.02 && wipe < 0.995)
}

export default function App() {
  const skipStored = readStored(STORAGE.skipIntro, '') === '1'
  const reduced = prefersReducedMotion()
  const threeD = shouldUse3D()
  const zoomParam = readZoomParam()

  const [stage, setStage] = useState(() => {
    if (skipStored) return 'os'
    if (zoomParam != null && zoomParam > 0 && zoomParam < 1) return 'zooming'
    if (zoomParam === 1) return 'os'
    if (zoomParam === 0) return 'boot'
    return 'loading'
  })
  const [themeId, setThemeId] = useState(() => readStored(STORAGE.theme, 'amber'))
  const [muted, setMuted] = useState(() => readStored(STORAGE.muted, '1') !== '0')
  const [ready3d, setReady3d] = useState(!threeD)
  const [loadProgress, setLoadProgress] = useState(8)
  const [overlayOn, setOverlayOn] = useState(() => (zoomParam ?? (skipStored ? 1 : 0)) >= 0.9)
  const [osMounted, setOsMounted] = useState(() => skipStored || (zoomParam ?? 0) >= 0.9)
  const [live, setLive] = useState('')
  const zoomRef = useRef(skipStored ? 1 : zoomParam ?? 0)
  const overlayOnRef = useRef((zoomParam ?? (skipStored ? 1 : 0)) >= 0.9)
  const overlayRef = useRef(null)
  const glassRectRef = useRef(null)
  const zoomRaf = useRef(0)
  const stageRef = useRef(stage)
  const startButtonRef = useRef(null)
  const parkedRef = useRef(null)
  stageRef.current = stage

  useCrtAudio(!muted && stage !== 'loading')

  useEffect(() => {
    applyTheme(themeId)
  }, [themeId])

  const announce = useCallback((message) => {
    setLive('')
    window.requestAnimationFrame(() => setLive(message))
  }, [])

  useEffect(() => {
    if (stage !== 'loading') return
    if (threeD && loadProgress < 92) {
      const fallback = window.setTimeout(() => setStage('boot'), 8000)
      return () => window.clearTimeout(fallback)
    }
    const timer = window.setTimeout(() => setStage('boot'), TIMING.loadingMinMs)
    return () => window.clearTimeout(timer)
  }, [loadProgress, stage, threeD])

  const persistSkip = () => {
    try {
      localStorage.setItem(STORAGE.skipIntro, '1')
    } catch {
      /* ignore */
    }
  }

  const finishToOs = useCallback(() => {
    zoomRef.current = 1
    overlayOnRef.current = true
    setOverlayOn(true)
    setOsMounted(true)
    persistSkip()
    setStage('os')
    announce('HARSH.OS')
    window.setTimeout(() => startButtonRef.current?.focus(), 40)
  }, [announce])

  const startZoom = useCallback(() => {
    const nowStage = stageRef.current
    if (nowStage !== 'boot' && nowStage !== 'parked') return
    if (reduced || !threeD) {
      zoomRef.current = 1
      overlayOnRef.current = true
      setOsMounted(true)
      setOverlayOn(true)
      setStage('os')
      announce('HARSH.OS')
      window.requestAnimationFrame(() => {
        const el = overlayRef.current
        if (!el) return
        el.classList.add('is-crossfade')
        el.style.opacity = '0'
        window.requestAnimationFrame(() => {
          el.style.opacity = '1'
        })
      })
      window.setTimeout(() => startButtonRef.current?.focus(), TIMING.crossfadeMs)
      return
    }
    setStage('zooming')
    const from = zoomRef.current
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / (nowStage === 'parked' ? TIMING.zoomOutMs : TIMING.zoomMs))
      const eased = easeInOut(t)
      zoomRef.current = from + (1 - from) * eased
      if (zoomRef.current >= 0.9 && !overlayOnRef.current) {
        overlayOnRef.current = true
        setOsMounted(true)
        setOverlayOn(true)
      }
      applyOverlayRect(overlayRef.current, glassRectRef.current, zoomRef.current)
      if (t < 1) {
        zoomRaf.current = requestAnimationFrame(tick)
      } else {
        finishToOs()
      }
    }
    zoomRaf.current = requestAnimationFrame(tick)
  }, [announce, finishToOs, reduced, threeD])

  const startZoomOut = useCallback(() => {
    if (stageRef.current !== 'os') return
    cancelAnimationFrame(zoomRaf.current)
    announce('Zoomed out to monitor. Press any key to return.')
    if (reduced || !threeD) {
      const el = overlayRef.current
      if (el) {
        el.classList.add('is-crossfade')
        el.style.opacity = '0'
      }
      window.setTimeout(() => {
        zoomRef.current = 0
        overlayOnRef.current = false
        setOverlayOn(false)
        setStage('parked')
        window.setTimeout(() => parkedRef.current?.focus(), 40)
      }, TIMING.crossfadeMs)
      return
    }
    setStage('zooming')
    const from = zoomRef.current || 1
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / TIMING.zoomOutMs)
      const eased = easeInOut(t)
      zoomRef.current = from * (1 - eased)
      if (zoomRef.current < 0.9) overlayOnRef.current = true
      applyOverlayRect(overlayRef.current, glassRectRef.current, zoomRef.current)
      if (t < 1) {
        zoomRaf.current = requestAnimationFrame(tick)
      } else {
        overlayOnRef.current = false
        setOverlayOn(false)
        setStage('parked')
        window.setTimeout(() => parkedRef.current?.focus(), 40)
      }
    }
    zoomRaf.current = requestAnimationFrame(tick)
  }, [announce, reduced, threeD])

  useEffect(() => () => cancelAnimationFrame(zoomRaf.current), [])

  useEffect(() => {
    if (!overlayOn && stage !== 'os') return
    applyOverlayRect(overlayRef.current, glassRectRef.current, zoomRef.current)
  }, [overlayOn, stage])

  useEffect(() => {
    if (stage !== 'parked') return
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
      if (event.type === 'keydown' && ignore(event)) return
      startZoom()
    }
    window.addEventListener('keydown', go)
    window.addEventListener('pointerdown', go)
    return () => {
      window.removeEventListener('keydown', go)
      window.removeEventListener('pointerdown', go)
    }
  }, [stage, startZoom])

  const skipIntro = () => {
    cancelAnimationFrame(zoomRaf.current)
    persistSkip()
    zoomRef.current = 1
    overlayOnRef.current = true
    setOverlayOn(true)
    setOsMounted(true)
    setStage('os')
    announce('HARSH.OS')
    window.setTimeout(() => startButtonRef.current?.focus(), 40)
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

  const overlayVisible = osMounted && stage !== 'parked' && (overlayOn || stage === 'os')
  const showSkip = (stage === 'loading' || stage === 'boot' || stage === 'zooming') && !overlayOn && stage !== 'parked'

  return (
    <main className="app" id="os-main">
      <a className="skip-link" href="#os-main">
        Skip to content
      </a>
      <div className="visually-hidden" aria-live="polite" aria-atomic="true">
        {live}
      </div>

      {threeD && (
        <>
          <div className="room-fallback" aria-hidden="true" />
          <Suspense fallback={<LoadingScreen progress={loadProgress} compact />}>
            <CRTScene
              zoomRef={zoomRef}
              onReady={() => setReady3d(true)}
              onProgress={setLoadProgress}
              bootRunning={stage === 'boot'}
              reducedMotion={reduced}
              revealed={ready3d || stage === 'os' || stage === 'parked'}
              enableDof={false}
              onBootReady={startZoom}
              onGlassRect={(rect) => {
                glassRectRef.current = rect
                window.__glassMetrics = rect
                if (overlayVisible || overlayOnRef.current) {
                  applyOverlayRect(overlayRef.current, rect, zoomRef.current)
                }
              }}
            />
          </Suspense>
        </>
      )}
      {stage === 'loading' && threeD && <LoadingScreen progress={loadProgress} compact />}

      {!threeD && (stage === 'loading' || stage === 'boot' || stage === 'zooming' || stage === 'parked') && (
        <FlatCRT stage={stage === 'parked' ? 'boot' : stage}>
          {stage === 'loading' && <LoadingScreen progress={loadProgress} />}
          {(stage === 'boot' || stage === 'parked') && (
            <BootScreen
              running={stage === 'boot'}
              onReady={startZoom}
              reduced={reduced || stage === 'parked'}
            />
          )}
        </FlatCRT>
      )}

      {osMounted && (
        <div
          ref={overlayRef}
          className={threeD ? 'screen-overlay is-framed' : 'flat-os-bezel'}
          hidden={!overlayVisible}
        >
          <OperatingSystem interactive={stage === 'os'} {...osProps} />
        </div>
      )}

      {stage === 'parked' && (
        <button ref={parkedRef} type="button" className="visually-hidden" onClick={startZoom}>
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
