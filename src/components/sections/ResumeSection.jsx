import { EDUCATION, EXPERIENCE, PROFILE, SKILL_CATEGORIES } from '../../content'

export default function ResumeSection() {
  return (
    <article>
      <h1 className="section-title">Resume</h1>
      <p>
        <a href={PROFILE.resumeHref} target="_blank" rel="noopener noreferrer">
          Open {PROFILE.resumeFile}
        </a>
      </p>
      <iframe
        className="resume-frame"
        title={PROFILE.resumeFile}
        src={`${PROFILE.resumeHref}#view=FitH`}
      />
      <h2 className="heading">Plain-text copy</h2>
      <p>
        <strong>{PROFILE.name}</strong>
        <br />
        {PROFILE.title}
      </p>
      <p>
        {PROFILE.email} / {PROFILE.phone}
        <br />
        {PROFILE.githubLabel} / {PROFILE.websiteLabel}
      </p>
      <h3 className="heading">Education</h3>
      <p>
        {EDUCATION.school}
        <br />
        {EDUCATION.degree}
      </p>
      <h3 className="heading">Experience</h3>
      {EXPERIENCE.map((job) => (
        <div key={job.role}>
          <strong>{job.role}</strong> — {job.date}
          <ul className="bullets">
            {job.bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
      <h3 className="heading">Skills</h3>
      {SKILL_CATEGORIES.map((group) => (
        <p key={group.title}>
          <strong>{group.title}:</strong> {group.skills.join(', ')}
        </p>
      ))}
    </article>
  )
}
