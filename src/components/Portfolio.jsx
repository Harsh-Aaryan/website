import React, { useState } from 'react'
import Taskbar from './Taskbar'
import Window from './Window'
import AboutSection from './sections/AboutSection'
import ProjectsSection from './sections/ProjectsSection'
import SkillsSection from './sections/SkillsSection'
import ContactSection from './sections/ContactSection'
import './Portfolio.css'

const Portfolio = () => {
  const [openWindows, setOpenWindows] = useState([{ id: 'about', title: 'ABOUT.TXT' }])
  const [activeWindow, setActiveWindow] = useState('about')
  const [colorScheme, setColorScheme] = useState('amber')

  const sections = {
    about: { title: 'ABOUT.TXT', component: AboutSection },
    projects: { title: 'PROJECTS/', component: ProjectsSection },
    skills: { title: 'SKILLS.TXT', component: SkillsSection },
    contact: { title: 'CONTACT.LNK', component: ContactSection },
    resume: { title: 'RESUME.PDF', component: null }
  }

  const openWindow = (id) => {
    if (id === 'resume') {
      window.open('/Harsh_Aaryan_Resume.pdf', '_blank')
      return
    }
    
    if (!openWindows.find(w => w.id === id)) {
      setOpenWindows([...openWindows, { id, title: sections[id].title }])
    }
    setActiveWindow(id)
  }

  const closeWindow = (id) => {
    setOpenWindows(openWindows.filter(w => w.id !== id))
    if (activeWindow === id && openWindows.length > 1) {
      const remainingWindows = openWindows.filter(w => w.id !== id)
      setActiveWindow(remainingWindows[remainingWindows.length - 1].id)
    }
  }

  const toggleColorScheme = () => {
    setColorScheme(prev => prev === 'amber' ? 'green' : 'amber')
    document.documentElement.setAttribute('data-theme', colorScheme === 'amber' ? 'green' : 'amber')
  }

  return (
    <div className={`portfolio ${colorScheme}-theme`} data-theme={colorScheme}>
      <div className="desktop">
        <div className="scanlines"></div>
        <div className="vignette"></div>
        
        <div className="windows-container">
          {openWindows.map(window => {
            const Section = sections[window.id].component
            return (
              <Window
                key={window.id}
                id={window.id}
                title={window.title}
                isActive={activeWindow === window.id}
                onClose={() => closeWindow(window.id)}
                onFocus={() => setActiveWindow(window.id)}
              >
                {Section && <Section />}
              </Window>
            )
          })}
        </div>
      </div>

      <Taskbar
        openWindows={openWindows}
        activeWindow={activeWindow}
        onWindowClick={setActiveWindow}
        onSectionOpen={openWindow}
        onColorToggle={toggleColorScheme}
        colorScheme={colorScheme}
      />
    </div>
  )
}

export default Portfolio
