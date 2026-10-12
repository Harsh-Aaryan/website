export default function LoadingScreen({ progress = 12, compact = false }) {
  const width = Math.max(8, Math.min(100, Math.round(progress)))
  if (compact) {
    return (
      <div className="scene-load-hud" role="status" aria-live="polite">
        <div>LOADING CRT {width}%</div>
        <div className="boot-loader-bar">
          <i style={{ width: `${width}%` }} />
        </div>
      </div>
    )
  }
  return (
    <div className="boot-screen" role="status" aria-live="polite">
      <div>BOOTING HARSH.OS...</div>
      <div className="boot-loader-bar" style={{ marginTop: 16, width: 220, height: 10, border: '1px solid var(--text-primary)', padding: 2 }}>
        <i style={{ display: 'block', height: '100%', width: `${width}%`, background: 'var(--text-primary)' }} />
      </div>
      <div style={{ marginTop: 12, color: 'var(--text-dim)' }}>
        LOADING CRT / HDRI / DESK … {width}%
      </div>
    </div>
  )
}
