export default function FlatCRT({ stage, children }) {
  const isOs = stage === 'os'

  return (
    <div className="flat-room scene-layer" aria-hidden={isOs}>
      <div className="flat-desk" />
      <div className="crt-stand" />
      <div className="crt-base" />
      <div className="flat-keyboard" />
      <div
        className={`crt-shell ${stage === 'zooming' ? 'is-zooming' : ''} ${isOs ? 'is-os' : ''}`}
      >
        <div className="crt-glass">{children}</div>
        {!isOs && (
          <>
            <span className="crt-bezel-label">HARSH 5151</span>
            <span className="crt-led" aria-hidden="true" />
          </>
        )}
      </div>
    </div>
  )
}
