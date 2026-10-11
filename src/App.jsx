import React, { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
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

export default function App() {
  const skipStored = readStored(STORAGE.skipIntro, '') === '1'
  const reduced = prefersReducedMotion()
  const threeD = shouldUse3D()

  const [stage, setStage] = useState(() => (skipStored || reduced ? 'os' : 'loading'))
  const [themeId, setThemeId] = useState(() => readStored(STORAGE.theme, 'amber'))
  const [muted, setMuted] = useState(() => readStored(STORAGE.muted, '1') !== '0')
  const [zoom, setZoom] = useState(skipStored || reduced ? 1 : 0)
  const [screenRect, setScreenRect] = useState(null)
  const [flash, setFlash] = useState(false)
  const [ready3d, setReady3d] = useState(!threeD)
  const [loadProgress, setLoadProgress] = useState(8)
  const zoomRaf = useRef(0)

  useCrtAudio(!muted && stage !== 'loading')

  useEffect(() => {
    applyTheme(themeId)
  }, [themeId])

  useEffect(() => {
    if (stage !== 'loading') return
    if (threeD && !ready3d) {
      const fallback = setTimeout(() => setStage('boot'), 4500)
      return () => clearTimeout(fallback)
    }
    const timer = setTimeout(() => setStage('boot'), threeD ? 380 : TIMING.loadingMinMs)
    return () => clearTimeout(timer)
  }, [ready3d, stage, threeD])

  const persistSkip = () => {
    try {
      localStorage.setItem(STORAGE.skipIntro, '1')
    } catch {
      /* ignore */
    }
  }

  const finishToOs = useCallback(() => {
    setFlash(true)
    setZoom(1)
    persistSkip()
    window.setTimeout(() => {
      setFlash(false)
      setStage('os')
    }, TIMING.handoffFlashMs)
  }, [])

  const startZoom = useCallback(() => {
    if (stage !== 'boot') return
    if (reduced) {
      finishToOs()
      return
    }
    setStage('zooming')
    const start = performance.now()
    const tick = (now) => {
      const t = Math.min(1, (now - start) / TIMING.zoomMs)
      const eased = t < 0.5 ? 4 * t * t * t : 1 - ((-2 * t + 2) ** 3) / 2
      setZoom(eased)
      if (t < 1) {
        zoomRaf.current = requestAnimationFrame(tick)
      } else {
        finishToOs()
      }
    }
    zoomRaf.current = requestAnimationFrame(tick)
  }, [finishToOs, reduced, stage])

  useEffect(() => () => cancelAnimationFrame(zoomRaf.current), [])

  const skipIntro = () => {
    cancelAnimationFrame(zoomRaf.current)
    persistSkip()
    setZoom(1)
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

  const showLanding = stage === 'loading' || stage === 'boot' || stage === 'zooming'
  const overlayFull = stage === 'os' || zoom > 0.93

  const overlayStyle = useMemo(() => {
    if (overlayFull) return undefined
    if (!screenRect) {
      return { top: '22%', left: '22%', width: '56%', height: '42%' }
    }
    return {
      top: `${screenRect.top}px`,
      left: `${screenRect.left}px`,
      width: `${screenRect.width}px`,
      height: `${screenRect.height}px`,
    }
  }, [overlayFull, screenRect])

  const os = (
    <OperatingSystem
      interactive={stage === 'os'}
      themeId={themeId}
      muted={muted}
      onToggleTheme={toggleTheme}
      onToggleMute={toggleMute}
    />
  )

  const glass = (
    <>
      {stage === 'loading' && !threeD && <LoadingScreen progress={loadProgress} />}
      {stage === 'boot' && !threeD && (
        <BootScreen running onReady={startZoom} reduced={reduced} />
      )}
      {stage === 'zooming' && os}
    </>
  )

  return (
    <div className="app">
      <a className="skip-link" href="#os-main">
        Skip to content
      </a>

      {showLanding && threeD && (
        <Suspense fallback={<LoadingScreen progress={loadProgress} />}>
          <CRTScene
            zoom={zoom}
            onScreenRect={setScreenRect}
            onReady={() => setReady3d(true)}
            onProgress={setLoadProgress}
            bootRunning={stage === 'boot'}
            reducedMotion={reduced}
          />
        </Suspense>
      )}
      {stage === 'boot' && threeD && (
        <div className="visually-hidden">
          <BootScreen running onReady={startZoom} reduced={reduced} />
        </div>
      )}
      {stage === 'loading' && threeD && <LoadingScreen progress={loadProgress} compact />}

      {showLanding && !threeD && (
        <FlatCRT zoom={zoom} stage={stage}>
          {glass}
        </FlatCRT>
      )}

      {showLanding && threeD && stage === 'zooming' && (
        <div
          className={`screen-overlay ${overlayFull ? 'is-full' : 'is-mapped'}`}
          style={overlayStyle}
        >
          {glass}
          {flash && <div className="handoff-flash" aria-hidden="true" />}
        </div>
      )}

      {stage === 'os' && os}

      {flash && stage !== 'os' && !threeD && <div className="handoff-flash" aria-hidden="true" />}

      {showLanding && (
        <button type="button" className="skip-intro-btn" onClick={skipIntro}>
          SKIP INTRO
        </button>
      )}
    </div>
  )
}
