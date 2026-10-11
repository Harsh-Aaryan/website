import { SKILL_CATEGORIES } from '../../content'

export default function SkillsSection() {
  return (
    <article>
      <h1 className="section-title">Skills</h1>
      {SKILL_CATEGORIES.map((group) => (
        <section key={group.title}>
          <h2 className="heading">{group.title}</h2>
          <div className="skill-grid">
            {group.skills.map((skill) => (
              <div key={skill} className="skill-item">
                &gt; {skill}
              </div>
            ))}
          </div>
        </section>
      ))}
    </article>
  )
}
