export default function LoadingScreen() {
  return (
    <div className="boot-screen" role="status" aria-live="polite">
      <div>BOOTING HARSH.OS...</div>
      <div className="boot-loader-bar" style={{ marginTop: 16, width: 220, height: 10, border: '1px solid var(--text-primary)', padding: 2 }}>
        <i style={{ display: 'block', height: '100%', width: '40%', background: 'var(--text-primary)' }} />
      </div>
      <div style={{ marginTop: 12, color: 'var(--text-dim)' }}>LOADING PHOSPHOR / DESK / PORTFOLIO.FS</div>
    </div>
  )
}
