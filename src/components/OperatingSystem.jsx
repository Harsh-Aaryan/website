import { useCallback, useEffect, useMemo, useState } from 'react'
import { prefersReducedMotion } from '../config'
import { SECTIONS } from '../content'
import AboutSection from './sections/AboutSection'
import ContactSection from './sections/ContactSection'
import CreditsSection from './CreditsSection'
import ProjectsSection from './sections/ProjectsSection'
import ResumeSection from './sections/ResumeSection'
import SkillsSection from './sections/SkillsSection'
import PixelIcon from './PixelIcon'
import Taskbar from './Taskbar'
import Window from './Window'

const BODIES = {
  about: AboutSection,
  projects: ProjectsSection,
  skills: SkillsSection,
  resume: ResumeSection,
  contact: ContactSection,
  credits: CreditsSection,
}

function formatClock(date) {
  const label = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return { label, iso: date.toISOString() }
}

export default function OperatingSystem({
  interactive,
  themeId,
  muted,
  onToggleTheme,
  onToggleMute,
}) {
  const [windows, setWindows] = useState(() => [
    { id: 'about', title: 'ABOUT.TXT', x: 128, y: 20, z: 2 },
  ])
  const [activeId, setActiveId] = useState('about')
  const [selectedIcon, setSelectedIcon] = useState('about')
  const [menuOpen, setMenuOpen] = useState(false)
  const [clock, setClock] = useState(() => formatClock(new Date()))
  const [mobile, setMobile] = useState(() => window.innerWidth <= 768)
  const zTop = useMemo(() => windows.reduce((max, win) => Math.max(max, win.z), 1), [windows])

  useEffect(() => {
    const id = window.setInterval(() => setClock(formatClock(new Date())), 1000)
    const onResize = () => setMobile(window.innerWidth <= 768)
    window.addEventListener('resize', onResize)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  const focus = useCallback((id) => {
    setActiveId(id)
    setWindows((prev) => {
      const top = prev.reduce((max, win) => Math.max(max, win.z), 1) + 1
      return prev.map((win) => (win.id === id ? { ...win, z: top } : win))
    })
    setMenuOpen(false)
  }, [])

  const openWindow = useCallback(
    (id) => {
      const meta = SECTIONS.find((section) => section.id === id)
      if (!meta) return
      setWindows((prev) => {
        if (prev.some((win) => win.id === id)) return prev
        const top = prev.reduce((max, win) => Math.max(max, win.z), 1) + 1
        return [
          ...prev,
          {
            id,
            title: meta.title,
            x: 96 + prev.length * 56,
            y: 18 + prev.length * 48,
            z: top,
          },
        ]
      })
      focus(id)
    },
    [focus]
  )

  const closeWindow = useCallback((id) => {
    setWindows((prev) => {
      const next = prev.filter((win) => win.id !== id)
      setActiveId(next[next.length - 1]?.id ?? null)
      return next
    })
  }, [])

  const moveWindow = useCallback((id, x, y) => {
    setWindows((prev) =>
      prev.map((win) =>
        win.id === id
          ? { ...win, x: Math.max(0, x), y: Math.max(0, y) }
          : win
      )
    )
  }, [])

  useEffect(() => {
    if (!interactive) return
    const onKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [interactive])

  return (
    <div
      className={`os-root ${prefersReducedMotion() ? 'reduce-motion' : ''}`}
      id="os-main"
      aria-hidden={!interactive}
      style={{ pointerEvents: interactive ? 'auto' : 'none' }}
    >
      <div className="desktop" onClick={() => { setSelectedIcon(null); setMenuOpen(false) }}>
        <nav
          className="icon-grid"
          aria-label="Desktop icons"
          hidden={mobile && windows.length > 0}
          onClick={(e) => e.stopPropagation()}
        >
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              type="button"
              className={`desktop-icon ${selectedIcon === section.id ? 'is-selected' : ''}`}
              onClick={() => setSelectedIcon(section.id)}
              onDoubleClick={() => openWindow(section.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  openWindow(section.id)
                }
              }}
            >
              <PixelIcon type={section.icon} />
              <span className="desktop-icon-label">{section.title}</span>
            </button>
          ))}
        </nav>

        {windows.map((win) => {
          const Body = BODIES[win.id]
          return (
            <Window
              key={win.id}
              id={win.id}
              title={win.title}
              active={activeId === win.id}
              z={win.z}
              x={win.x}
              y={win.y}
              mobile={mobile}
              onClose={closeWindow}
              onFocus={focus}
              onMove={moveWindow}
            >
              {Body ? <Body /> : null}
            </Window>
          )
        })}
      </div>

      <Taskbar
        windows={windows}
        activeId={activeId}
        menuOpen={menuOpen}
        onToggleMenu={() => setMenuOpen((open) => !open)}
        onOpen={openWindow}
        onFocus={focus}
        themeId={themeId}
        muted={muted}
        onToggleTheme={onToggleTheme}
        onToggleMute={onToggleMute}
        clock={clock}
      />

      <div className="scanlines" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />
      <div className="crt-flicker" aria-hidden="true" />
    </div>
  )
}
