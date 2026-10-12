const PATHS = {
  file: 'M6 2h14v4h4v24H6V2zm14 2v2h2V4h-2zM8 8h16v2H8V8zm0 4h16v2H8v-2zm0 4h12v2H8v-2z',
  folder: 'M4 8h8l3 3h13v17H4V8zm2 5v13h20V13H6z',
  doc: 'M8 2h12l6 6v22H8V2zm12 2v5h5l-5-5zM12 16h12v2H12v-2zm0 4h12v2H12v-2zm0 4h8v2h-8v-2z',
  link: 'M10 14h12v2H10v-2zm-4 8h4v2H6v-2zm4-16h4v4h-4V6zm12 0h4v4h-4V6zM6 22h20v2H6v-2zM14 10h4v12h-4V10z',
}

export default function PixelIcon({ type = 'file', size = 32 }) {
  return (
    <svg
      className="pixel-icon"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      aria-hidden="true"
      shapeRendering="crispEdges"
    >
      <path d={PATHS[type] || PATHS.file} fill="currentColor" />
    </svg>
  )
}
