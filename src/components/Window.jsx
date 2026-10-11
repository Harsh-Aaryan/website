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
      const ox = drag.current.ox ?? 0
      const oy = drag.current.oy ?? 0
      onMove(id, event.clientX - ox - drag.current.dx, event.clientY - oy - drag.current.dy)
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
    const root = event.currentTarget.closest('.os-root')
    const origin = root?.getBoundingClientRect()
    const ox = origin?.left ?? 0
    const oy = origin?.top ?? 0
    drag.current = { dx: event.clientX - ox - x, dy: event.clientY - oy - y, ox, oy }
    setGrabbing(true)
  }

  return (
    <section
      className={`window ${active ? 'is-active' : ''} ${grabbing ? 'is-dragging' : ''}`}
      style={
        mobile
          ? { zIndex: z }
          : { left: x, top: y, zIndex: z, maxHeight: `calc(100% - ${y + 8}px)` }
      }
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
