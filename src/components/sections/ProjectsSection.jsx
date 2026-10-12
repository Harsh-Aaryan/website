import { PROJECTS } from '../../content'

export default function ProjectsSection() {
  return (
    <article>
      <h1 className="section-title">Projects</h1>
      {PROJECTS.map((project) => (
        <section key={project.title} className="card">
          <h2 className="heading" style={{ marginTop: 0 }}>
            {project.title}
          </h2>
          <p>{project.description}</p>
          <div className="tags">
            {project.tech.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </div>
          <p>
            {project.live && (
              <>
                Live: <a href={project.live.url} target="_blank" rel="noopener noreferrer">{project.live.label}</a>
              </>
            )}
            {project.live && project.repo && ' | '}
            {project.repo && (
              <>
                Repo: <a href={project.repo.url} target="_blank" rel="noopener noreferrer">{project.repo.label}</a>
              </>
            )}
          </p>
        </section>
      ))}
    </article>
  )
}
