import { useEffect, useState } from 'react'
import { TIMING } from '../config'
import { BOOT_LINES } from '../content'

export default function BootScreen({ running, onReady, reduced }) {
  const [count, setCount] = useState(reduced ? BOOT_LINES.length : 1)
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
    const go = () => onReady()
    const timer = window.setTimeout(go, reduced ? 0 : TIMING.bootHoldMs)
    window.addEventListener('keydown', go)
    window.addEventListener('pointerdown', go)
    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('keydown', go)
      window.removeEventListener('pointerdown', go)
    }
  }, [onReady, ready, reduced, running])

  return (
    <div className="boot-screen" role="dialog" aria-label="HARSH.OS boot">
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
