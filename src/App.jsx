import React, { useState, useEffect } from 'react'
import CRTMonitor from './components/CRTMonitor'
import BootSequence from './components/BootSequence'
import Portfolio from './components/Portfolio'
import './styles/App.css'

function App() {
  const [stage, setStage] = useState('loading')
  const [skipIntro, setSkipIntro] = useState(false)

  useEffect(() => {
    const hasSeenIntro = localStorage.getItem('hasSeenCRTIntro')
    if (hasSeenIntro === 'true') {
      setSkipIntro(true)
      setStage('zoomed')
    } else {
      setTimeout(() => setStage('boot'), 500)
    }
  }, [])

  const handleBootComplete = () => {
    setStage('zooming')
    setTimeout(() => {
      setStage('zoomed')
      localStorage.setItem('hasSeenCRTIntro', 'true')
    }, 2500)
  }

  const handleSkipIntro = () => {
    setStage('zoomed')
    localStorage.setItem('hasSeenCRTIntro', 'true')
  }

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  useEffect(() => {
    if (prefersReducedMotion) {
      setStage('zoomed')
    }
  }, [prefersReducedMotion])

  return (
    <div className="app">
      {stage !== 'zoomed' && (
        <>
          <CRTMonitor stage={stage} />
          {stage === 'boot' && (
            <BootSequence onComplete={handleBootComplete} />
          )}
          {(stage === 'boot' || stage === 'zooming') && (
            <button 
              className="skip-intro-btn"
              onClick={handleSkipIntro}
              aria-label="Skip intro animation"
            >
              Skip Intro
            </button>
          )}
        </>
      )}
      {stage === 'zoomed' && <Portfolio />}
    </div>
  )
}

export default App
