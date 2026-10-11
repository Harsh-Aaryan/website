export default function FlatCRT({ zoom, stage, children }) {
  const scale = 1 + zoom * 1.35
  const isOs = stage === 'os'

  return (
    <div className="flat-room scene-layer" aria-hidden={isOs}>
      <div className="flat-desk" />
      <div className="flat-keyboard" />
      <div
        className={`crt-shell ${stage === 'zooming' ? 'is-zooming' : ''} ${isOs ? 'is-os' : ''}`}
        style={
          isOs
            ? undefined
            : {
                transform: `scale(${scale})`,
                transition: stage === 'zooming' ? 'transform 0.05s linear' : undefined,
              }
        }
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
