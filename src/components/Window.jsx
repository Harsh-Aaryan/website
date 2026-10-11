import { useEffect, useRef, useState } from 'react'

export default function Window({
  id,
  title,
  active,
  z,
  x,
  y,
  onClose,
  onFocus,
  onMove,
  children,
  mobile,
}) {
  const drag = useRef(null)
  const [grabbing, setGrabbing] = useState(false)

  useEffect(() => {
    const move = (event) => {
      if (!drag.current) return
      onMove(id, event.clientX - drag.current.dx, event.clientY - drag.current.dy)
    }
    const up = () => {
      drag.current = null
      setGrabbing(false)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
  }, [id, onMove])

  const onBarDown = (event) => {
    if (mobile) return
    if (event.target.closest('.window-close')) return
    onFocus(id)
    drag.current = { dx: event.clientX - x, dy: event.clientY - y }
    setGrabbing(true)
  }

  return (
    <section
      className={`window ${active ? 'is-active' : ''} ${grabbing ? 'is-dragging' : ''}`}
      style={mobile ? { zIndex: z } : { left: x, top: y, zIndex: z }}
      onPointerDown={() => onFocus(id)}
      aria-labelledby={`win-title-${id}`}
    >
      <header className="window-titlebar" onPointerDown={onBarDown}>
        <button type="button" className="window-close" onClick={() => onClose(id)} aria-label={`Close ${title}`}>
          [x]
        </button>
        <h2 id={`win-title-${id}`} className="window-title">
          {title}
        </h2>
      </header>
      <div className="window-body">{children}</div>
    </section>
  )
}
