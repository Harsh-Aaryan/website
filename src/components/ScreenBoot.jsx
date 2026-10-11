import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { TIMING } from '../config'
import { BOOT_LINES } from '../content'

/** Amber BIOS text painted onto a CanvasTexture for the CRT glass. */
export function useBootTexture({ running, reduced, onReady }) {
  const canvas = useMemo(() => {
    const el = document.createElement('canvas')
    el.width = 1024
    el.height = 768
    return el
  }, [])

  const texture = useMemo(() => {
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 8
    tex.generateMipmaps = false
    tex.minFilter = THREE.NearestFilter
    tex.magFilter = THREE.NearestFilter
    tex.flipY = true
    return tex
  }, [canvas])

  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  useEffect(() => {
    const ctx = canvas.getContext('2d')
    let cancelled = false
    let intervalId = 0
    let holdId = 0
    let finished = false

    const finish = () => {
      if (cancelled || finished || !running) return
      finished = true
      const hold = new URLSearchParams(window.location.search).get('hold') === '1'
      if (hold) return
      holdId = window.setTimeout(() => onReadyRef.current?.(), reduced ? 0 : TIMING.bootHoldMs)
    }

    const paintBackground = () => {
      ctx.fillStyle = '#0E0A05'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = 'rgba(255, 176, 0, 0.03)'
      for (let y = 0; y < canvas.height; y += 4) {
        ctx.fillRect(0, y, canvas.width, 1)
      }
    }

    const paintVignette = () => {
      const edge = ctx.createRadialGradient(512, 384, 340, 512, 384, 640)
      edge.addColorStop(0, 'rgba(14, 10, 5, 0)')
      edge.addColorStop(0.8, 'rgba(14, 10, 5, 0.02)')
      edge.addColorStop(1, 'rgba(8, 6, 3, 0.18)')
      ctx.fillStyle = edge
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    const draw = (count) => {
      paintBackground()
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      // White glyphs × emissive #FFB000 keep phosphor exact (toneMapped false).
      ctx.fillStyle = '#FFFFFF'
      ctx.font = '36px VT323, "IBM Plex Mono", ui-monospace, monospace'
      ctx.textBaseline = 'top'
      const padX = Math.round(canvas.width * 0.18)
      const lineH = 38
      const padY = Math.round(canvas.height * 0.26)
      let y = padY
      BOOT_LINES.slice(0, count).forEach((line) => {
        ctx.fillText(line || ' ', padX, y)
        y += lineH
      })
      if (count >= BOOT_LINES.length) {
        ctx.fillRect(padX, y + 8, 14, 24)
      }
      paintVignette()
      texture.needsUpdate = true
      if (count >= BOOT_LINES.length) finish()
    }

    const start = () => {
      if (cancelled) return
      if (!running) {
        draw(BOOT_LINES.length)
        return
      }
      if (reduced) {
        draw(BOOT_LINES.length)
        return
      }
      let count = 1
      draw(count)
      intervalId = window.setInterval(() => {
        count += 1
        draw(Math.min(count, BOOT_LINES.length))
        if (count >= BOOT_LINES.length) window.clearInterval(intervalId)
      }, TIMING.bootLineMs)
    }

    let started = false
    const begin = () => {
      if (started || cancelled) return
      started = true
      start()
    }
    if (document.fonts?.ready) document.fonts.ready.then(begin)
    window.setTimeout(begin, 400)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.clearTimeout(holdId)
    }
  }, [canvas, reduced, running, texture])

  return texture
}
