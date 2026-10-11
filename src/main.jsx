import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'
import './styles/os.css'

window.__crtDebug = {
  stage: 'boot',
  lock: false,
  progress: 0,
  t: 0,
  target: null,
  display: null,
  running: false,
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
