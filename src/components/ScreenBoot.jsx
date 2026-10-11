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
    tex.generateMipmaps = false
    tex.minFilter = THREE.NearestFilter
    tex.magFilter = THREE.NearestFilter
    tex.flipY = true
    return tex
  }, [canvas])

  useEffect(() => {
    const ctx = canvas.getContext('2d')
    let cancelled = false
    let intervalId = 0

    const paintBackground = () => {
      ctx.fillStyle = '#120c06'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      const glow = ctx.createRadialGradient(512, 384, 50, 512, 400, 520)
      glow.addColorStop(0, 'rgba(255, 176, 0, 0.22)')
      glow.addColorStop(0.55, 'rgba(255, 176, 0, 0.06)')
      glow.addColorStop(1, 'rgba(14, 10, 5, 0)')
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.fillStyle = 'rgba(255, 176, 0, 0.04)'
      for (let y = 0; y < canvas.height; y += 4) {
        ctx.fillRect(0, y, canvas.width, 1)
      }
    }

    const paintVignette = () => {
      const edge = ctx.createRadialGradient(512, 384, 210, 512, 384, 540)
      edge.addColorStop(0, 'rgba(8, 6, 3, 0)')
      edge.addColorStop(0.58, 'rgba(8, 6, 3, 0.1)')
      edge.addColorStop(0.82, 'rgba(6, 4, 2, 0.42)')
      edge.addColorStop(1, 'rgba(4, 2, 1, 0.92)')
      ctx.fillStyle = edge
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    }

    const draw = (count) => {
      paintBackground()
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.fillStyle = '#FFB000'
      ctx.font = '52px VT323, "IBM Plex Mono", ui-monospace, monospace'
      ctx.textBaseline = 'top'
      let y = 44
      BOOT_LINES.slice(0, count).forEach((line) => {
        ctx.fillText(line || ' ', 48, y)
        y += 52
      })
      if (count >= BOOT_LINES.length) {
        ctx.fillRect(48, y + 8, 18, 32)
      }
      paintVignette()
      texture.needsUpdate = true
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
    }
  }, [canvas, reduced, running, texture])

  return texture
}
