import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'
import './styles/os.css'

const params = new URLSearchParams(window.location.search)
const ua = navigator.userAgent || ''
const phone = /iPhone|iPod/i.test(ua) || (/Android/i.test(ua) && /Mobile/i.test(ua))
if (params.get('flat') !== '1') {
  if (phone) import('./components/CRTSceneLite')
  else import('./components/CRTScene')
}

window.__crtDebug = {
  stage: 'boot',
  lock: false,
  progress: 0,
  t: 0,
  target: null,
  display: null,
  running: false,
  lite: false,
  draws: 0,
  fps: null,
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
