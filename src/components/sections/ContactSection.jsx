import React from 'react'
import './Section.css'

const ContactSection = () => {
  return (
    <div className="section contact-section">
      <h1 className="section-title">Contact</h1>
      
      <div className="terminal-box">
        <div className="terminal-line">$ cat contact.txt</div>
        <div className="terminal-output">
          Let's build something amazing together!
          <br/><br/>
          I'm always open to:
          <br/>
          • Software Engineering Opportunities
          <br/>
          • Full-stack Development Projects
          <br/>
          • Open Source Contributions
          <br/>
          • Tech Discussions
        </div>
      </div>

      <h2 className="section-heading">GET IN TOUCH</h2>
      
      <div className="contact-links">
        <a href="mailto:harsharyan4@gmail.com" className="contact-item">
          <span className="contact-icon">📧</span>
          <div>
            <div className="contact-label">EMAIL</div>
            <div className="contact-value">harsharyan4@gmail.com</div>
          </div>
        </a>

        <a href="https://github.com/Harsh-Aaryan" target="_blank" rel="noopener noreferrer" className="contact-item">
          <span className="contact-icon">🐙</span>
          <div>
            <div className="contact-label">GITHUB</div>
            <div className="contact-value">@Harsh-Aaryan</div>
          </div>
        </a>

        <a href="https://harshaaryan.tech" target="_blank" rel="noopener noreferrer" className="contact-item">
          <span className="contact-icon">🌐</span>
          <div>
            <div className="contact-label">WEBSITE</div>
            <div className="contact-value">harshaaryan.tech</div>
          </div>
        </a>

        <a href="/Harsh_Aaryan_Resume.pdf" target="_blank" className="contact-item">
          <span className="contact-icon">📄</span>
          <div>
            <div className="contact-label">RESUME</div>
            <div className="contact-value">Harsh_Aaryan_Resume.pdf</div>
          </div>
        </a>
      </div>

      <div className="terminal-box" style={{ marginTop: '2rem' }}>
        <div className="terminal-line">$ _</div>
      </div>
    </div>
  )
}

export default ContactSection
