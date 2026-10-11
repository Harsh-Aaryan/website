import React, { useState, useRef, useEffect } from 'react'
import './Window.css'

const Window = ({ id, title, isActive, onClose, onFocus, children }) => {
  const [position, setPosition] = useState({ x: 50 + Math.random() * 100, y: 50 + Math.random() * 50 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const windowRef = useRef(null)

  const handleMouseDown = (e) => {
    if (e.target.closest('.window-title-bar') && !e.target.closest('.window-close')) {
      setIsDragging(true)
      const rect = windowRef.current.getBoundingClientRect()
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      })
      onFocus()
    }
  }

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isDragging) {
        setPosition({
          x: e.clientX - dragOffset.x,
          y: e.clientY - dragOffset.y
        })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
    }

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, dragOffset])

  return (
    <div
      ref={windowRef}
      className={`window ${isActive ? 'active' : ''} ${isDragging ? 'dragging' : ''}`}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onMouseDown={onFocus}
    >
      <div className="window-title-bar" onMouseDown={handleMouseDown}>
        <button 
          className="window-close"
          onClick={onClose}
          aria-label="Close window"
        >
          [x]
        </button>
        <div className="window-title">{title}</div>
      </div>
      <div className="window-content">
        {children}
      </div>
    </div>
  )
}

export default Window
