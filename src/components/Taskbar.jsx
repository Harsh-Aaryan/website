import React, { useState, useEffect } from 'react'
import './Taskbar.css'

const Taskbar = ({ openWindows, activeWindow, onWindowClick, onSectionOpen, onColorToggle, colorScheme }) => {
  const [time, setTime] = useState(new Date())
  const [isMuted, setIsMuted] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const sections = [
    { id: 'about', label: 'ABOUT.TXT' },
    { id: 'projects', label: 'PROJECTS/' },
    { id: 'skills', label: 'SKILLS.TXT' },
    { id: 'contact', label: 'CONTACT.LNK' },
    { id: 'resume', label: 'RESUME.PDF' }
  ]

  return (
    <div className="taskbar">
      <div className="taskbar-start">
        <button 
          className="start-button"
          onClick={() => {}}
          aria-label="Start menu"
        >
          HARSH.OS
        </button>
      </div>

      <div className="taskbar-tabs">
        {openWindows.map(window => (
          <button
            key={window.id}
            className={`taskbar-tab ${activeWindow === window.id ? 'active' : ''}`}
            onClick={() => onWindowClick(window.id)}
          >
            {window.title}
          </button>
        ))}
      </div>

      <div className="taskbar-tray">
        <button
          className="taskbar-icon"
          onClick={onColorToggle}
          aria-label={`Switch to ${colorScheme === 'amber' ? 'green' : 'amber'} theme`}
          title={`Switch to ${colorScheme === 'amber' ? 'green' : 'amber'}`}
        >
          {colorScheme === 'amber' ? 'A' : 'G'}
        </button>
        <button
          className="taskbar-icon"
          onClick={() => setIsMuted(!isMuted)}
          aria-label={isMuted ? 'Unmute' : 'Mute'}
          title={isMuted ? 'Unmute' : 'Mute'}
        >
          {isMuted ? '🔇' : '🔊'}
        </button>
        <div className="taskbar-clock">
          {formatTime(time)}
        </div>
      </div>

      <div className="desktop-icons">
        {sections.map(section => (
          <button
            key={section.id}
            className="desktop-icon"
            onClick={() => onSectionOpen(section.id)}
            onDoubleClick={() => onSectionOpen(section.id)}
          >
            <div className="icon-image">[{section.id === 'resume' ? '📄' : section.id === 'projects' ? '📁' : '📝'}]</div>
            <div className="icon-label">{section.label}</div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default Taskbar
