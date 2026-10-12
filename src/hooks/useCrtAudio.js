import { useEffect, useRef } from 'react'
import { TIMING } from '../config'

export function useCrtAudio(enabled) {
  const nodes = useRef(null)

  useEffect(() => {
    if (!enabled) {
      if (nodes.current) {
        nodes.current.gain.gain.setTargetAtTime(0, nodes.current.ctx.currentTime, 0.05)
      }
      return
    }

    const AudioCtx = window.AudioContext || window.webkitAudioContext
    if (!AudioCtx) return

    const ctx = nodes.current?.ctx || new AudioCtx()
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    let osc = nodes.current?.osc
    let gain = nodes.current?.gain
    if (!osc) {
      osc = ctx.createOscillator()
      gain = ctx.createGain()
      osc.type = 'sine'
      osc.frequency.value = TIMING.humFreq
      gain.gain.value = 0
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
    }

    gain.gain.setTargetAtTime(TIMING.humGain, ctx.currentTime, 0.2)
    nodes.current = { ctx, osc, gain }

    return () => {
      if (nodes.current) {
        nodes.current.gain.gain.setTargetAtTime(0, nodes.current.ctx.currentTime, 0.08)
      }
    }
  }, [enabled])
}
