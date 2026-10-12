import { ASCII_BANNER, EDUCATION, EXPERIENCE, INTERESTS, PROFILE } from '../../content'

export default function AboutSection() {
  return (
    <article>
      <pre className="ascii-art" aria-hidden="true" inert tabIndex={-1}>{ASCII_BANNER}</pre>
      <h1 className="section-title">{PROFILE.name}</h1>
      <p className="section-sub">{PROFILE.title}</p>

      <div className="meta-block">
        <div className="meta-row">
          <span className="k">EMAIL</span>
          <a href={`mailto:${PROFILE.email}`}>{PROFILE.email}</a>
        </div>
        <div className="meta-row">
          <span className="k">PHONE</span>
          <span>{PROFILE.phone}</span>
        </div>
        <div className="meta-row">
          <span className="k">GITHUB</span>
          <a href={PROFILE.githubUrl} target="_blank" rel="noopener noreferrer">
            {PROFILE.githubLabel}
          </a>
        </div>
        <div className="meta-row">
          <span className="k">WEBSITE</span>
          <a href={PROFILE.websiteUrl} target="_blank" rel="noopener noreferrer">
            {PROFILE.websiteLabel}
          </a>
        </div>
      </div>

      <h2 className="heading">Education</h2>
      <p>{EDUCATION.school}</p>
      <p>{EDUCATION.degree}</p>

      <h2 className="heading">Experience</h2>
      {EXPERIENCE.map((job) => (
        <div key={job.role}>
          <div className="job-head">
            <strong>{job.role}</strong>
            <span className="date">{job.date}</span>
          </div>
          <ul className="bullets">
            {job.bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ))}

      <div className="term-box">
        <div className="term-cmd">$ cat interests.txt</div>
        {INTERESTS.map((item) => (
          <div key={item} className="term-out">
            * {item}
          </div>
        ))}
      </div>
    </article>
  )
}
