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

export default function App() {
  const skipStored = readStored(STORAGE.skipIntro, '') === '1'
  const reduced = prefersReducedMotion()
  const threeD = shouldUse3D()
  const zoomParam = readZoomParam()

  const [stage, setStage] = useState(() => {
    if (skipStored || reduced) return 'os'
    if (zoomParam != null && zoomParam > 0) return 'zooming'
    return 'loading'
  })
  const [themeId, setThemeId] = useState(() => readStored(STORAGE.theme, 'amber'))
  const [muted, setMuted] = useState(() => readStored(STORAGE.muted, '1') !== '0')
  const [flash, setFlash] = useState(false)
  const [ready3d, setReady3d] = useState(!threeD)
  const [loadProgress, setLoadProgress] = useState(8)
  const [overlayOn, setOverlayOn] = useState(() => (zoomParam ?? 0) >= 0.9)
  const [sceneOn, setSceneOn] = useState(() => {
    if (!threeD) return false
    if (skipStored || reduced) return false
    return zoomParam != null && zoomParam > 0
  })
  const zoomRef = useRef(skipStored || reduced ? 1 : zoomParam ?? 0)
  const overlayOnRef = useRef((zoomParam ?? 0) >= 0.9)
  const zoomRaf = useRef(0)

  useCrtAudio(!muted && stage !== 'loading')

  useEffect(() => {
    applyTheme(themeId)
  }, [themeId])

  useEffect(() => {
    if (threeD && (stage === 'boot' || stage === 'zooming')) setSceneOn(true)
  }, [stage, threeD])

  useEffect(() => {
    if (stage !== 'loading') return
    const timer = setTimeout(() => setStage('boot'), TIMING.loadingMinMs)
    return () => clearTimeout(timer)
  }, [stage])

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
        setFlash(true)
        window.setTimeout(() => setFlash(false), TIMING.handoffFlashMs)
      }
      if (t < 1) {
        zoomRaf.current = requestAnimationFrame(tick)
      } else {
        finishToOs()
      }
    }
    zoomRaf.current = requestAnimationFrame(tick)
  }, [finishToOs, reduced, stage, threeD])

  useEffect(() => () => cancelAnimationFrame(zoomRaf.current), [])

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

  const showLanding = stage === 'loading' || stage === 'boot' || stage === 'zooming'
  const osProps = {
    themeId,
    muted,
    onToggleTheme: toggleTheme,
    onToggleMute: toggleMute,
  }

  return (
    <div className="app">
      <a className="skip-link" href="#os-main">
        Skip to content
      </a>

      {showLanding && threeD && (
        <>
          <div className="room-fallback" aria-hidden="true" />
          {sceneOn && (
            <Suspense fallback={<LoadingScreen progress={loadProgress} compact />}>
              <CRTScene
                zoomRef={zoomRef}
                onReady={() => setReady3d(true)}
                onProgress={setLoadProgress}
                bootRunning={stage === 'boot' || stage === 'loading'}
                reducedMotion={reduced}
                revealed={ready3d}
                enableDof={stage !== 'zooming'}
              />
            </Suspense>
          )}
        </>
      )}
      {stage === 'boot' && threeD && (
        <div className={ready3d ? 'visually-hidden' : 'boot-on-room'}>
          <BootScreen running onReady={startZoom} reduced={reduced} />
        </div>
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
        <div className="screen-overlay is-full is-wiping">
          <OperatingSystem interactive={false} {...osProps} />
          {flash && <div className="handoff-flash" aria-hidden="true" />}
        </div>
      )}

      {stage === 'os' && <OperatingSystem interactive {...osProps} />}

      {flash && stage !== 'os' && !threeD && <div className="handoff-flash" aria-hidden="true" />}

      {showLanding && !overlayOn && (
        <button type="button" className="skip-intro-btn" onClick={skipIntro}>
          SKIP INTRO
        </button>
      )}
    </div>
  )
}
