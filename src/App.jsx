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
  const zoomParam = readZoomParam()
  const [use3d, setUse3d] = useState(() => shouldUse3D())

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
  const zoomLock = useRef(false)
  const welcomed = useRef(false)
  const pendingLand = useRef(false)
  const announceTimer = useRef(0)
  const stageRef = useRef(stage)
  const startButtonRef = useRef(null)
  const parkedRef = useRef(null)
  const use3dRef = useRef(use3d)
  const zoomWatch = useRef(0)
  const zoomTarget = useRef(null)
  const zoomAnim = useRef(false)
  const queuedDir = useRef(null)
  const flatTimer = useRef(0)
  const requestZoomRef = useRef(() => {})
  use3dRef.current = use3d
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
  }

  const clearZoomWatch = () => {
    window.clearTimeout(zoomWatch.current)
    zoomWatch.current = 0
  }

  const clearZoomMotion = () => {
    cancelAnimationFrame(zoomRaf.current)
    window.clearTimeout(flatTimer.current)
    zoomRaf.current = 0
    flatTimer.current = 0
    clearZoomWatch()
  }

  const releaseZoom = () => {
    zoomLock.current = false
    zoomAnim.current = false
    clearZoomWatch()
  }

  const flushQueuedZoom = () => {
    const next = queuedDir.current
    queuedDir.current = null
    releaseZoom()
    if (next) window.queueMicrotask(() => requestZoomRef.current(next))
  }

  const snapParked = useCallback(() => {
    clearZoomMotion()
    zoomRef.current = 0
    overlayOnRef.current = false
    setOverlayOn(false)
    setOsMounted(true)
    goStage('parked')
    flushQueuedZoom()
  }, [goStage])

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

  const finishToOs = useCallback(() => {
    zoomRef.current = 1
    overlayOnRef.current = true
    setOverlayOn(true)
    setOsMounted(true)
    persistSkip()
    pendingLand.current = true
    goStage('os')
    landOnOs()
    flushQueuedZoom()
  }, [goStage, landOnOs])

  const abandon3d = useCallback(() => {
    if (!use3dRef.current) {
      clearZoomMotion()
      queuedDir.current = null
      releaseZoom()
      return
    }
    use3dRef.current = false
    setUse3d(false)
    setReady3d(true)
    clearOverlayFrame()
    clearZoomMotion()
    queuedDir.current = null
    releaseZoom()
    glassRectRef.current = null
    const now = stageRef.current
    const toOs =
      now === 'os' ||
      now === 'loading' ||
      now === 'boot' ||
      zoomTarget.current === 'os' ||
      zoomRef.current >= 0.45
    if (toOs) {
      pendingLand.current = true
      zoomRef.current = 1
      overlayOnRef.current = true
      setOverlayOn(true)
      setOsMounted(true)
      persistSkip()
      goStage('os')
      landOnOs()
    } else {
      snapParked()
    }
  }, [goStage, landOnOs, snapParked])

  const armZoomWatch = useCallback(
    (target) => {
      zoomTarget.current = target
      clearZoomWatch()
      zoomWatch.current = window.setTimeout(() => {
        if (stageRef.current !== 'zooming' && !zoomLock.current) return
        cancelAnimationFrame(zoomRaf.current)
        zoomLock.current = false
        if (use3dRef.current && !glassRectRef.current) {
          abandon3d()
          return
        }
        if (target === 'os') {
          pendingLand.current = true
          finishToOs()
        } else {
          snapParked()
        }
      }, TIMING.zoomWatchMs)
    },
    [abandon3d, finishToOs, snapParked]
  )

  useEffect(() => {
    if (stage !== 'os') return
    if (!pendingLand.current && welcomed.current) return
    pendingLand.current = true
    landOnOs()
  }, [landOnOs, stage])

  const beginZoomIn = useCallback(() => {
    zoomLock.current = true
    zoomAnim.current = true
    queuedDir.current = null
    clearZoomMotion()
    armZoomWatch('os')
    if (reduced || !use3d) {
      zoomRef.current = 1
      overlayOnRef.current = true
      setOsMounted(true)
      setOverlayOn(true)
      pendingLand.current = true
      goStage('os')
      landOnOs()
      window.requestAnimationFrame(() => {
        const el = overlayRef.current
        if (!el) return
        el.classList.add('is-crossfade')
        el.style.opacity = '0'
        window.requestAnimationFrame(() => {
          el.style.opacity = '1'
        })
      })
      flatTimer.current = window.setTimeout(() => {
        startButtonRef.current?.focus()
        flushQueuedZoom()
      }, TIMING.crossfadeMs)
      return
    }
    goStage('zooming')
    const from = zoomRef.current
    const start = performance.now()
    const ms = from > 0.05 ? TIMING.zoomOutMs : TIMING.zoomMs
    const tick = (now) => {
      const t = Math.min(1, (now - start) / ms)
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
  }, [armZoomWatch, finishToOs, goStage, landOnOs, reduced, use3d])

  const beginZoomOut = useCallback(() => {
    zoomLock.current = true
    zoomAnim.current = true
    queuedDir.current = null
    clearZoomMotion()
    armZoomWatch('parked')
    announce('Zoomed out to monitor. Press any key to return.')
    if (reduced || !use3d) {
      const el = overlayRef.current
      if (el) {
        el.classList.add('is-crossfade')
        el.style.opacity = '0'
      }
      goStage('zooming')
      flatTimer.current = window.setTimeout(() => {
        if (el) {
          el.classList.remove('is-crossfade')
          el.style.opacity = '1'
        }
        zoomRef.current = 0
        overlayOnRef.current = false
        setOverlayOn(false)
        goStage('parked')
        window.setTimeout(() => parkedRef.current?.focus(), 40)
        flushQueuedZoom()
      }, TIMING.crossfadeMs)
      return
    }
    goStage('zooming')
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
        goStage('parked')
        window.setTimeout(() => parkedRef.current?.focus(), 40)
        flushQueuedZoom()
      }
    }
    zoomRaf.current = requestAnimationFrame(tick)
  }, [announce, armZoomWatch, goStage, reduced, use3d])

  const requestZoom = useCallback(
    (dir) => {
      const running = zoomAnim.current || Boolean(zoomRaf.current) || Boolean(flatTimer.current)
      if (zoomLock.current && running) {
        if (zoomTarget.current === dir) return
        queuedDir.current = dir
        zoomLock.current = false
        zoomAnim.current = false
        clearZoomMotion()
        if (dir === 'os') beginZoomIn()
        else beginZoomOut()
        return
      }
      if (zoomLock.current && !running) {
        zoomLock.current = false
        clearZoomWatch()
      }
      if (dir === 'os') {
        const now = stageRef.current
        if (now === 'os' && !zoomAnim.current) return
        beginZoomIn()
        return
      }
      if (stageRef.current === 'parked' && !zoomAnim.current) return
      beginZoomOut()
    },
    [beginZoomIn, beginZoomOut]
  )
  requestZoomRef.current = requestZoom

  const startZoom = useCallback(() => requestZoom('os'), [requestZoom])
  const startZoomOut = useCallback(() => requestZoom('parked'), [requestZoom])

  useEffect(
    () => () => {
      clearZoomMotion()
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
    window.addEventListener('webglcontextlost', onLost, true)
    return () => window.removeEventListener('webglcontextlost', onLost, true)
  }, [abandon3d])

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== 'hidden') return
      if (stageRef.current !== 'zooming' && !zoomLock.current) return
      clearZoomMotion()
      if (zoomTarget.current === 'parked') snapParked()
      else {
        pendingLand.current = true
        finishToOs()
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [finishToOs, snapParked])

  useEffect(() => {
    if (!use3d) return
    const id = window.setTimeout(() => {
      if (use3dRef.current && !glassRectRef.current) abandon3d()
    }, TIMING.zoomWatchMs)
    return () => window.clearTimeout(id)
  }, [abandon3d, use3d])

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
  }, [stage, startZoom])

  const skipIntro = () => {
    queuedDir.current = null
    clearZoomMotion()
    releaseZoom()
    persistSkip()
    zoomRef.current = 1
    overlayOnRef.current = true
    setOverlayOn(true)
    setOsMounted(true)
    pendingLand.current = true
    goStage('os')
    landOnOs()
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
  const showSkip =
    !osMounted &&
    (stage === 'loading' || stage === 'boot' || stage === 'zooming') &&
    !overlayOn

  return (
    <main className="app" id="os-main" data-display={use3d ? '3d' : 'flat'}>
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
            <CRTScene
              zoomRef={zoomRef}
              onReady={() => setReady3d(true)}
              onProgress={setLoadProgress}
              bootRunning={stage === 'boot'}
              reducedMotion={reduced}
              revealed={ready3d || stage === 'os' || stage === 'parked'}
              enableDof={false}
              onContextLost={abandon3d}
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
          className={use3d ? 'screen-overlay is-framed' : 'flat-os-bezel'}
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
        <button type="button" className="scene-recover" onClick={startZoom}>
          PRESS ANY KEY
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
