import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { TIMING } from '../config'
import { BOOT_LINES } from '../content'

/** Amber BIOS text painted onto a CanvasTexture for the CRT glass. */
export function useBootTexture({ running, reduced }) {
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
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    return tex
  }, [canvas])

  useEffect(() => {
    const ctx = canvas.getContext('2d')
    let cancelled = false
    let intervalId = 0

    const paintBackground = () => {
      ctx.fillStyle = '#0E0A05'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      const glow = ctx.createRadialGradient(512, 380, 40, 512, 400, 520)
      glow.addColorStop(0, 'rgba(255, 176, 0, 0.08)')
      glow.addColorStop(1, 'rgba(14, 10, 5, 0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = 'rgba(255, 176, 0, 0.03)'
      for (let y = 0; y < canvas.height; y += 4) {
        ctx.fillRect(0, y, canvas.width, 1)
      }
    }

    const draw = (count) => {
      paintBackground()
      ctx.shadowColor = 'rgba(255, 176, 0, 0.35)'
      ctx.shadowBlur = 4
      ctx.fillStyle = '#FFB000'
      ctx.font = '34px VT323, "IBM Plex Mono", ui-monospace, monospace'
      ctx.textBaseline = 'top'
      ctx.letterSpacing = '1px'
      let y = 48
      BOOT_LINES.slice(0, count).forEach((line) => {
        ctx.fillText(line || ' ', 48, y)
        y += 44
      })
      if (count >= BOOT_LINES.length) {
        ctx.fillRect(48, y + 4, 16, 28)
      }
      texture.needsUpdate = true
    }

    const start = () => {
      if (cancelled) return
      if (!running) {
        paintBackground()
        texture.needsUpdate = true
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

    start()
    if (document.fonts?.ready) {
      document.fonts.ready.then(() => {
        if (!cancelled && !running) {
          paintBackground()
          texture.needsUpdate = true
        }
      })
    }

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [canvas, reduced, running, texture])

  return texture
}
