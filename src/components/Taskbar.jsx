import { SECTIONS } from '../content'
import PixelIcon from './PixelIcon'

export default function Taskbar({
  windows,
  activeId,
  menuOpen,
  onToggleMenu,
  onOpen,
  onFocus,
  themeId,
  muted,
  onToggleTheme,
  onToggleMute,
  clock,
}) {
  return (
    <footer className="taskbar">
      <div className="start-wrap">
        <button
          type="button"
          className={`start-button ${menuOpen ? 'is-open' : ''}`}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          onClick={onToggleMenu}
        >
          HARSH.OS
        </button>
        {menuOpen && (
          <div className="start-menu" role="menu">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                role="menuitem"
                onClick={() => onOpen(section.id)}
              >
                <PixelIcon type={section.icon} size={16} />
                {section.title}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="taskbar-tabs" role="tablist" aria-label="Open windows">
        {windows.map((win) => (
          <button
            key={win.id}
            type="button"
            role="tab"
            aria-selected={activeId === win.id}
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
