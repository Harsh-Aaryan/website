import { useEffect, useRef } from 'react'
import { SECTIONS } from '../content'
import PixelIcon from './PixelIcon'

export default function Taskbar({
  windows,
  activeId,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onOpen,
  onFocus,
  themeId,
  muted,
  onToggleTheme,
  onToggleMute,
  clock,
}) {
  const itemRefs = useRef([])
  const startRef = useRef(null)

  useEffect(() => {
    if (menuOpen) itemRefs.current[0]?.focus()
  }, [menuOpen])

  const closeAndRestore = () => {
    startRef.current?.focus()
    onCloseMenu()
  }

  const onMenuKey = (event) => {
    const items = itemRefs.current.filter(Boolean)
    if (!items.length) return
    const index = Math.max(0, items.indexOf(document.activeElement))
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      items[(index + 1) % items.length].focus()
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      items[(index - 1 + items.length) % items.length].focus()
    } else if (event.key === 'Home') {
      event.preventDefault()
      items[0].focus()
    } else if (event.key === 'End') {
      event.preventDefault()
      items[items.length - 1].focus()
    } else if (event.key === 'Escape') {
      event.preventDefault()
      closeAndRestore()
    }
  }

  const onWrapBlur = (event) => {
    if (!menuOpen) return
    if (event.currentTarget.contains(event.relatedTarget)) return
    onCloseMenu()
  }

  return (
    <footer className="taskbar">
      <div className="start-wrap" onBlur={onWrapBlur}>
        <button
          ref={startRef}
          type="button"
          className={`start-button ${menuOpen ? 'is-open' : ''}`}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={onToggleMenu}
        >
          HARSH.OS
        </button>
        {menuOpen && (
          <div className="start-menu" role="menu" onKeyDown={onMenuKey}>
            {SECTIONS.map((section, index) => (
              <button
                key={section.id}
                type="button"
                role="menuitem"
                ref={(el) => {
                  itemRefs.current[index] = el
                }}
                onClick={() => onOpen(section.id)}
              >
                <PixelIcon type={section.icon} size={16} />
                {section.title}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="taskbar-tabs" aria-label="Open windows">
        {windows.map((win) => (
          <button
            key={win.id}
            type="button"
            aria-pressed={activeId === win.id}
            className={`taskbar-tab ${activeId === win.id ? 'is-active' : ''}`}
            onClick={() => onFocus(win.id)}
          >
            {win.title}
          </button>
        ))}
      </div>

      <div className="taskbar-tray">
        <button
          type="button"
          className="tray-btn"
          onClick={onToggleTheme}
          aria-label={`Theme ${themeId}. Switch phosphor.`}
          title="Toggle amber/green phosphor"
        >
          {themeId === 'amber' ? 'AMB' : 'GRN'}
        </button>
        <button
          type="button"
          className="tray-btn"
          onClick={onToggleMute}
          aria-pressed={!muted}
          aria-label={muted ? 'Unmute CRT hum' : 'Mute CRT hum'}
        >
          {muted ? 'HUM:OFF' : 'HUM:ON'}
        </button>
        <time className="taskbar-clock" dateTime={clock.iso}>
          {clock.label}
        </time>
      </div>
    </footer>
  )
}
