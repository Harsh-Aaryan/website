import React from 'react'
import './Section.css'

const ProjectsSection = () => {
  const projects = [
    {
      title: 'HomeNode',
      subtitle: '[PickHacks 26 Winner]',
      description: 'Built a mobile-first smart energy arbitrage platform combining household battery insights, local weather, and grid-intensity signals to convert homes into nano data centers. Developed AI-assisted job scheduling with a secure FastAPI backend (server-side API keys, fallback logic) and deployed a production stack on Netlify and Render. Implemented modular data hooks and personalized controls (location, units, battery profile, automation) for real-time dashboards tracking energy impact and revenue.',
      tech: ['React', 'Vite', 'FastAPI', 'Python', 'Auth0', 'Leaflet'],
      links: [
        { label: 'Live', url: 'https://homenode.netlify.app/' },
        { label: 'Repo', url: 'https://github.com/Harsh-Aaryan/EcoAI' }
      ]
    },
    {
      title: 'AutoTrader',
      description: 'Developed an automated stock trading bot with real-time trading, position monitoring, and loop offset strategies. Integrated a Telegram bot with encrypted messaging and a remote kill switch. Implemented multi-threading for concurrent market data processing via WebSocket, Monte Carlo backtesting, and AWS Secrets Manager for secure API key management.',
      tech: ['Python', 'Alpaca API', 'Telegram Bot', 'Docker', 'AWS']
    },
    {
      title: 'Canvas-RPG',
      subtitle: '[2nd Place, PickHacks 25]',
      description: 'Built a Chrome extension and Progressive Web App converting Canvas LMS into an RPG-styled game using the Canvas API for personalized quests. Achieved 700+ downloads on the Chrome Web Store.',
      tech: ['React', 'Python', 'JavaScript', 'GraphQL', 'Canvas API', 'Chrome Extension'],
      links: [
        { label: 'Repo', url: 'https://github.com/Harsh-Aaryan/canvas-rpg' }
      ]
    },
    {
      title: 'AI-Music Discord Bot',
      description: 'Created an AI-powered Discord bot for generating music using Suno LLM. Integrated Suno\'s sound generation API, deploying it on Vercel due to limited API availability. Utilized Postman for API testing and debugging, ensuring seamless communication between the bot and the sound generation service.',
      tech: ['Python', 'REST API', 'Vercel', 'Postman']
    },
    {
      title: 'Smart Cart',
      description: 'Designed and implemented a fully functional Smart Cart store checkout system with integrated front-end and back-end components. Made use of PostgreSQL database for product management; a C++ backend optimized for performance and memory; and an HTML, CSS, and JavaScript front-end enabling user checkout, payment, and order processing.',
      tech: ['C++', 'PostgreSQL', 'HTML/CSS', 'JavaScript']
    }
  ]

  return (
    <div className="section projects-section">
      <h1 className="section-title">Projects</h1>
      
      {projects.map((project, index) => (
        <div key={index} className="project-card">
          <h3 className="project-title">
            {project.title}
            {project.subtitle && <span className="project-subtitle"> {project.subtitle}</span>}
          </h3>
          <p className="project-description">{project.description}</p>
          
          <div className="tech-tags">
            {project.tech.map((tech, i) => (
              <span key={i} className="tech-tag">{tech}</span>
            ))}
          </div>
          
          {project.links && (
            <div className="project-links">
              {project.links.map((link, i) => (
                <a key={i} href={link.url} target="_blank" rel="noopener noreferrer" className="link">
                  [{link.label}]
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

export default ProjectsSection
