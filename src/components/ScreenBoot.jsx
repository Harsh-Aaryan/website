import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { TIMING } from '../config'
import { BOOT_LINES } from '../content'

function paintBoot(canvas, count) {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = '#0E0A05'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = 'rgba(255, 176, 0, 0.03)'
  for (let y = 0; y < canvas.height; y += 4) {
    ctx.fillRect(0, y, canvas.width, 1)
  }
  ctx.shadowColor = 'transparent'
  ctx.shadowBlur = 0
  ctx.fillStyle = '#FFFFFF'
  ctx.font = '28px VT323, "IBM Plex Mono", ui-monospace, monospace'
  ctx.textBaseline = 'top'
  const padX = Math.round(canvas.width * 0.12)
  const lineH = 32
  const blockH = BOOT_LINES.length * lineH + 22
  const padY = Math.round((canvas.height - blockH) / 2)
  let y = padY
  BOOT_LINES.slice(0, count).forEach((line) => {
    ctx.fillText(line || ' ', padX, y)
    y += lineH
  })
  if (count >= BOOT_LINES.length) {
    ctx.fillRect(padX, y + 8, 14, 24)
  }
  const edge = ctx.createRadialGradient(512, 384, 340, 512, 384, 640)
  edge.addColorStop(0, 'rgba(14, 10, 5, 0)')
  edge.addColorStop(0.8, 'rgba(14, 10, 5, 0.02)')
  edge.addColorStop(1, 'rgba(8, 6, 3, 0.18)')
  ctx.fillStyle = edge
  ctx.fillRect(0, 0, canvas.width, canvas.height)
}

/** Amber BIOS text painted onto a CanvasTexture for the CRT glass. */
export function useBootTexture({ running, reduced, onReady }) {
  const canvas = useMemo(() => {
    const el = document.createElement('canvas')
    el.width = 1024
    el.height = 768
    paintBoot(el, BOOT_LINES.length)
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
    tex.needsUpdate = true
    return tex
  }, [canvas])

  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  useEffect(() => {
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

    const draw = (count) => {
      if (cancelled) return
      paintBoot(canvas, count)
      texture.needsUpdate = true
      if (count >= BOOT_LINES.length) finish()
    }

    if (!running || reduced) {
      draw(BOOT_LINES.length)
      return () => {
        cancelled = true
        window.clearTimeout(holdId)
      }
    }

    let count = 1
    draw(count)
    intervalId = window.setInterval(() => {
      count += 1
      draw(Math.min(count, BOOT_LINES.length))
      if (count >= BOOT_LINES.length) window.clearInterval(intervalId)
    }, TIMING.bootLineMs)

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
      window.clearTimeout(holdId)
    }
  }, [canvas, reduced, running, texture])

  return texture
}
