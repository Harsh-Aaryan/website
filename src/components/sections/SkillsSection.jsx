import React from 'react'
import './Section.css'

const SkillsSection = () => {
  const skillCategories = [
    {
      title: 'Languages',
      skills: ['JavaScript', 'TypeScript', 'Python', 'C#', 'Java', 'C++', 'SQL', 'HTML5', 'CSS3', 'Assembly']
    },
    {
      title: 'Frontend',
      skills: ['React', 'Vite', 'TypeScript', 'GraphQL', 'Recharts', 'Leaflet']
    },
    {
      title: 'Backend & APIs',
      skills: ['Node.js', 'FastAPI', '.NET', 'REST APIs', 'WebSocket', 'API development']
    },
    {
      title: 'Databases & Cloud',
      skills: ['PostgreSQL', 'SQL Server', 'Azure', 'AWS', 'Netlify', 'Render']
    },
    {
      title: 'DevOps & Tools',
      skills: ['Git', 'Docker', 'Azure DevOps', 'CI/CD', 'Auth0', 'Agile', 'Scrum']
    }
  ]

  return (
    <div className="section skills-section">
      <h1 className="section-title">Skills</h1>
      
      {skillCategories.map((category, index) => (
        <div key={index} className="skill-category">
          <h2 className="section-heading">{category.title}</h2>
          <div className="skills-grid">
            {category.skills.map((skill, i) => (
              <div key={i} className="skill-item">
                <span className="prompt">&gt;</span> {skill}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default SkillsSection
