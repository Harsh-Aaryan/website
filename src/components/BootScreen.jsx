import { useEffect, useRef, useState } from 'react'
import { TIMING } from '../config'
import { BOOT_LINES } from '../content'

export default function BootScreen({ running, onReady, reduced }) {
  const [count, setCount] = useState(reduced ? BOOT_LINES.length : 1)
  const boxRef = useRef(null)
  const ready = count >= BOOT_LINES.length

  useEffect(() => {
    if (!running || reduced) {
      setCount(BOOT_LINES.length)
      return
    }
    let i = 1
    const id = window.setInterval(() => {
      i += 1
      setCount(Math.min(i, BOOT_LINES.length))
      if (i >= BOOT_LINES.length) window.clearInterval(id)
    }, TIMING.bootLineMs)
    return () => window.clearInterval(id)
  }, [running, reduced])

  useEffect(() => {
    if (!running || !ready) return
    const hold = new URLSearchParams(window.location.search).get('hold') === '1'
    const go = () => onReady()
    const timer = hold ? 0 : window.setTimeout(go, reduced ? 0 : TIMING.bootHoldMs)
    window.addEventListener('keydown', go)
    window.addEventListener('pointerdown', go)
    return () => {
      if (timer) window.clearTimeout(timer)
      window.removeEventListener('keydown', go)
      window.removeEventListener('pointerdown', go)
    }
  }, [onReady, ready, reduced, running])

  useEffect(() => {
    boxRef.current?.focus()
    const onKey = (event) => {
      if (event.key !== 'Tab') return
      const dialog = boxRef.current
      const skip = document.querySelector('.skip-intro-btn')
      const cycle = [dialog, skip].filter(Boolean)
      if (!cycle.length) return
      event.preventDefault()
      const index = cycle.indexOf(document.activeElement)
      const next = event.shiftKey
        ? cycle[(index - 1 + cycle.length) % cycle.length]
        : cycle[(index + 1) % cycle.length]
      next.focus()
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [])

  return (
    <div
      ref={boxRef}
      className="boot-screen"
      role="dialog"
      aria-modal="true"
      aria-label="HARSH.OS boot"
      tabIndex={-1}
    >
      {BOOT_LINES.slice(0, count).map((line, index) => (
        <div key={`${line}-${index}`} className="boot-line">
          {line || '\u00a0'}
        </div>
      ))}
      {ready && (
        <div className="boot-line">
          <span className="boot-cursor" aria-hidden="true" />
        </div>
      )}
    </div>
  )
}
