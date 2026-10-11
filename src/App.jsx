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

function easeZoom(t) {
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

function applyOverlayRect(el, rect, zoom) {
  if (!el || !rect) return
  const u = smoothstep((zoom - 0.9) / 0.1)
  const box = visibleGlassRect(rect)
  const vw = window.innerWidth
  const vh = window.innerHeight
  el.style.left = `${box.left * (1 - u)}px`
  el.style.top = `${box.top * (1 - u)}px`
  el.style.width = `${box.width + (vw - box.width) * u}px`
  el.style.height = `${box.height + (vh - box.height) * u}px`
  // Hit 0 by ~0.93 so HARSH.OS / clock are never inside a tube mask.
  const radiusU = Math.min(1, u / 0.28)
  el.style.borderRadius = `${(8 * (1 - radiusU)).toFixed(1)}px`
  el.classList.toggle('is-mapped', u < 0.995)
  el.classList.toggle('is-full', u >= 0.995)
}

export default function App() {
  const skipStored = readStored(STORAGE.skipIntro, '') === '1'
  const reduced = prefersReducedMotion()
  const threeD = shouldUse3D()
  const zoomParam = readZoomParam()

  const [stage, setStage] = useState(() => {
    if (skipStored) return 'os'
    if (zoomParam != null && zoomParam > 0) return 'zooming'
    return 'loading'
  })
  const [themeId, setThemeId] = useState(() => readStored(STORAGE.theme, 'amber'))
  const [muted, setMuted] = useState(() => readStored(STORAGE.muted, '1') !== '0')
  const [flash, setFlash] = useState(false)
  const [ready3d, setReady3d] = useState(!threeD)
  const [loadProgress, setLoadProgress] = useState(8)
  const [overlayOn, setOverlayOn] = useState(() => (zoomParam ?? 0) >= 0.9)
  const zoomRef = useRef(skipStored ? 1 : zoomParam ?? 0)
  const overlayOnRef = useRef((zoomParam ?? 0) >= 0.9)
  const overlayRef = useRef(null)
  const glassRectRef = useRef(null)
  const zoomRaf = useRef(0)

  useCrtAudio(!muted && stage !== 'loading')

  useEffect(() => {
    applyTheme(themeId)
  }, [themeId])

  const showLanding = stage === 'loading' || stage === 'boot' || stage === 'zooming'

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
    setFlash(true)
    persistSkip()
    window.setTimeout(() => {
      setFlash(false)
      setStage('os')
    }, TIMING.handoffFlashMs)
  }, [])

  const startZoom = useCallback(() => {
    if (stage !== 'boot') return
    if (reduced || !threeD) {
      setStage('zooming')
      window.setTimeout(finishToOs, reduced ? 80 : TIMING.zoomMs)
      return
    }
    setStage('zooming')
    overlayOnRef.current = false
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / TIMING.zoomMs)
      const eased = easeZoom(t)
      zoomRef.current = eased
      if (eased >= 0.9 && !overlayOnRef.current) {
        overlayOnRef.current = true
        setOverlayOn(true)
      }
      applyOverlayRect(overlayRef.current, glassRectRef.current, eased)
      if (t < 1) {
        zoomRaf.current = requestAnimationFrame(tick)
      } else {
        finishToOs()
      }
    }
    zoomRaf.current = requestAnimationFrame(tick)
  }, [finishToOs, reduced, stage, threeD])

  useEffect(() => () => cancelAnimationFrame(zoomRaf.current), [])

  useEffect(() => {
    if (!overlayOn) return
    applyOverlayRect(overlayRef.current, glassRectRef.current, zoomRef.current)
  }, [overlayOn])

  const skipIntro = () => {
    cancelAnimationFrame(zoomRaf.current)
    persistSkip()
    zoomRef.current = 1
    setStage('os')
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
  }

  return (
    <main className="app" id="os-main">
      <a className="skip-link" href="#os-main">
        Skip to content
      </a>

      {showLanding && threeD && (
        <>
          <div className="room-fallback" aria-hidden="true" />
          <Suspense fallback={<LoadingScreen progress={loadProgress} compact />}>
            <CRTScene
              zoomRef={zoomRef}
              onReady={() => setReady3d(true)}
              onProgress={setLoadProgress}
              bootRunning={stage === 'boot'}
              reducedMotion={reduced}
              revealed={ready3d}
              enableDof={false}
              onBootReady={startZoom}
              onGlassRect={(rect) => {
                glassRectRef.current = rect
                window.__glassMetrics = rect
                applyOverlayRect(overlayRef.current, rect, zoomRef.current)
              }}
            />
          </Suspense>
        </>
      )}
      {stage === 'loading' && threeD && <LoadingScreen progress={loadProgress} compact />}

      {showLanding && !threeD && (
        <FlatCRT stage={stage}>
          {stage === 'loading' && <LoadingScreen progress={loadProgress} />}
          {stage === 'boot' && <BootScreen running onReady={startZoom} reduced={reduced} />}
          {stage === 'zooming' && <OperatingSystem interactive={false} {...osProps} />}
        </FlatCRT>
      )}

      {showLanding && threeD && stage === 'zooming' && overlayOn && (
        <div ref={overlayRef} className="screen-overlay is-mapped">
          <OperatingSystem interactive={false} {...osProps} />
        </div>
      )}

      {stage === 'os' && <OperatingSystem interactive {...osProps} />}

      {flash && stage !== 'os' && !threeD && <div className="handoff-flash" aria-hidden="true" />}

      {showLanding && !overlayOn && (
        <button type="button" className="skip-intro-btn" onClick={skipIntro}>
          SKIP INTRO
        </button>
      )}
    </main>
  )
}
