import React, { useState, useEffect } from 'react'
import './BootSequence.css'

const BootSequence = ({ onComplete }) => {
  const [lines, setLines] = useState([])
  const [showPrompt, setShowPrompt] = useState(false)

  const bootMessages = [
    'SYSTEM INITIALIZING...',
    'CHECKING MEMORY... OK',
    'LOADING KERNEL... OK',
    'MOUNTING FILESYSTEMS... OK',
    'STARTING NETWORK... OK',
    'INITIALIZING GRAPHICS... OK',
    'LOADING USER PROFILE...',
    '',
    'HARSH AARYAN PORTFOLIO v1.0',
    '',
    'PRESS ANY KEY TO CONTINUE...'
  ]

  useEffect(() => {
    let currentLine = 0
    const interval = setInterval(() => {
      if (currentLine < bootMessages.length) {
        setLines(prev => [...prev, bootMessages[currentLine]])
        currentLine++
      } else {
        clearInterval(interval)
        setShowPrompt(true)
      }
    }, 200)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (showPrompt) {
      const handleInteraction = () => {
        onComplete()
      }

      window.addEventListener('keydown', handleInteraction)
      window.addEventListener('click', handleInteraction)

      return () => {
        window.removeEventListener('keydown', handleInteraction)
        window.removeEventListener('click', handleInteraction)
      }
    }
  }, [showPrompt, onComplete])

  return (
    <div className="boot-sequence">
      <div className="boot-content">
        {lines.map((line, index) => (
          <div key={index} className="boot-line">
            {line && <span className="boot-prompt">&gt;</span>} {line}
          </div>
        ))}
        {showPrompt && <span className="boot-cursor">_</span>}
      </div>
    </div>
  )
}

export default BootSequence
