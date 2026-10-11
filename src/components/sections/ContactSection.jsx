import { CONTACT_PITCH, PROFILE } from '../../content'

const LINKS = [
  { label: 'EMAIL', value: PROFILE.email, href: `mailto:${PROFILE.email}` },
  { label: 'GITHUB', value: `@Harsh-Aaryan`, href: PROFILE.githubUrl },
  { label: 'WEBSITE', value: PROFILE.websiteLabel, href: PROFILE.websiteUrl },
  { label: 'RESUME (PDF)', value: PROFILE.resumeFile, href: PROFILE.resumeHref },
]

export default function ContactSection() {
  return (
    <article>
      <h1 className="section-title">Contact</h1>
      <div className="term-box">
        <div className="term-cmd">$ cat contact.txt</div>
        <div className="term-out">{CONTACT_PITCH[0]}</div>
        <div className="term-out">{CONTACT_PITCH[1]}</div>
        {CONTACT_PITCH.slice(2).map((line) => (
          <div key={line} className="term-out">
            * {line}
          </div>
        ))}
        <div className="term-cmd">
          ${' '}
          <span className="boot-cursor" aria-hidden="true" />
        </div>
      </div>

      <h2 className="heading">Get in touch</h2>
      {LINKS.map((item) => (
        <a key={item.label} className="contact-row" href={item.href} target={item.href.startsWith('http') || item.href.endsWith('.pdf') ? '_blank' : undefined} rel="noreferrer">
          <span className="k">{item.label}</span>
          <span>{item.value}</span>
        </a>
      ))}
    </article>
  )
}
