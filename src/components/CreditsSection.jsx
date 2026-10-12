import { SCENE_CREDITS } from '../content'

export default function CreditsSection() {
  return (
    <article>
      <h1 className="section-title">CREDITS.TXT</h1>
      <p className="section-sub">Landing CRT uses CC0 assets from Poly Haven.</p>
      {SCENE_CREDITS.map((item) => (
        <div key={item.title} className="credit-row">
          <strong>{item.title}</strong>
          <span>
            {item.author} — {item.license} —{' '}
            <a href={item.source} target="_blank" rel="noopener noreferrer">
              {item.source.replace('https://', '')}
            </a>
            {item.note ? ` (${item.note})` : ''}
          </span>
        </div>
      ))}
    </article>
  )
}
