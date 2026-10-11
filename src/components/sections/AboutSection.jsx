import React from 'react'
import './Section.css'

const AboutSection = () => {
  return (
    <div className="section about-section">
      <h1 className="section-title">Harsh Aaryan</h1>
      <p className="section-subtitle">Computer Science Student & Software Engineer</p>

      <div className="info-block">
        <div className="info-line">
          <span className="prompt">&gt;</span>
          <span className="label">EMAIL:</span>
          <a href="mailto:harsharyan4@gmail.com" className="link">harsharyan4@gmail.com</a>
        </div>
        <div className="info-line">
          <span className="prompt">&gt;</span>
          <span className="label">PHONE:</span>
          <span>425-209-8017</span>
        </div>
        <div className="info-line">
          <span className="prompt">&gt;</span>
          <span className="label">GITHUB:</span>
          <a href="https://github.com/Harsh-Aaryan" target="_blank" rel="noopener noreferrer" className="link">
            github.com/Harsh-Aaryan
          </a>
        </div>
        <div className="info-line">
          <span className="prompt">&gt;</span>
          <span className="label">WEBSITE:</span>
          <a href="https://harshaaryan.tech" target="_blank" rel="noopener noreferrer" className="link">
            harshaaryan.tech
          </a>
        </div>
      </div>

      <h2 className="section-heading">EDUCATION</h2>
      <div className="content-block">
        <div className="item-header">
          <strong>Missouri University of Science & Technology</strong>
          <span className="date">Spring 2026</span>
        </div>
        <p>Bachelor of Science in Computer Science (GPA - 3.7/4.0)</p>
      </div>

      <h2 className="section-heading">EXPERIENCE</h2>
      
      <div className="content-block">
        <div className="item-header">
          <strong>Lead Research Assistant - Cybersecurity Research</strong>
          <span className="date">Aug 2025 - Present</span>
        </div>
        <ul className="bullet-list">
          <li>Researched cybersecurity vulnerabilities in L2-L4 autonomous vehicle systems using luminescent materials to exploit sensor systems; analyzed attack vectors and developed countermeasures using Python machine learning algorithms</li>
          <li>Implemented ROS2/CARLA simulation testbeds to evaluate stability, scalability, and efficiency of distributed adversarial perception systems</li>
        </ul>
      </div>

      <div className="content-block">
        <div className="item-header">
          <strong>Prime Therapeutics - Software Engineer Intern</strong>
          <span className="date">May 2024 - July 2024</span>
        </div>
        <ul className="bullet-list">
          <li>Built full-stack internal video sharing platform with React frontend and Node.js backend; developed REST APIs and reusable UI components using JavaScript, HTML5, and CSS3</li>
          <li>Engineered data pipelines achieving sub-5 second video upload and retrieval; contributed to code reviews in an Agile/Scrum environment using Git</li>
        </ul>
      </div>

      <div className="content-block">
        <div className="item-header">
          <strong>PeoplePerHour - Front End Developer</strong>
          <span className="date">Feb 2020 - May 2023</span>
        </div>
        <ul className="bullet-list">
          <li>Delivered 200+ client web applications using HTML5, CSS3, and JavaScript; maintained a 95% client satisfaction rate through iterative design and strong communication</li>
        </ul>
      </div>

      <h2 className="section-heading">INTERESTS</h2>
      <div className="terminal-box">
        <div className="terminal-line">$ cat interests.txt</div>
        <div className="terminal-output">
          • Web Development<br/>
          • Cybersecurity Research<br/>
          • Full-Stack Engineering<br/>
          • AI / ML & Simulation
        </div>
      </div>
    </div>
  )
}

export default AboutSection
