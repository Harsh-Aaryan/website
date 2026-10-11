/** All site copy, preserved from the existing portfolio. */
export const PROFILE = {
  name: 'Harsh Aaryan',
  title: 'Computer Science Student & Software Engineer',
  email: 'harsharyan4@gmail.com',
  phone: '425-209-8017',
  githubLabel: 'github.com/Harsh-Aaryan',
  githubUrl: 'https://github.com/Harsh-Aaryan',
  websiteLabel: 'harshaaryan.netlify.app',
  websiteUrl: 'https://harshaaryan.netlify.app',
  resumeFile: 'Harsh_Aaryan_Resume.pdf',
  resumeHref: '/Harsh_Aaryan_Resume.pdf',
}

export const ASCII_BANNER = String.raw`
 ██████╗███████╗    ██████╗  ██████╗ ██████╗ ████████╗███████╗ ██████╗ ██╗     ██╗ ██████╗
██╔════╝██╔════╝    ██╔══██╗██╔═══██╗██╔══██╗╚══██╔══╝██╔════╝██╔═══██╗██║     ██║██╔═══██╗
██║     ███████╗    ██████╔╝██║   ██║██████╔╝   ██║   █████╗  ██║   ██║██║     ██║██║   ██║
██║     ╚════██║    ██╔═══╝ ██║   ██║██╔══██╗   ██║   ██╔══╝  ██║   ██║██║     ██║██║   ██║
╚██████╗███████║    ██║     ╚██████╔╝██║  ██║   ██║   ██║     ╚██████╔╝███████╗██║╚██████╔╝
 ╚═════╝╚══════╝    ╚═╝      ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚═╝      ╚═════╝ ╚══════╝╚═╝ ╚═════╝
`

export const EDUCATION = {
  school: 'Missouri University of Science & Technology (Spring 2026)',
  degree: 'Bachelor of Science in Computer Science (GPA - 3.7/4.0)',
}

export const EXPERIENCE = [
  {
    role: 'Lead Research Assistant - Cybersecurity Research',
    date: 'Aug 2025 - Present',
    bullets: [
      'Researched cybersecurity vulnerabilities in L2-L4 autonomous vehicle systems using luminescent materials to exploit sensor systems; analyzed attack vectors and developed countermeasures using Python machine learning algorithms',
      'Implemented ROS2/CARLA simulation testbeds to evaluate stability, scalability, and efficiency of distributed adversarial perception systems',
    ],
  },
  {
    role: 'Prime Therapeutics - Software Engineer Intern',
    date: 'May 2024 - July 2024',
    bullets: [
      'Built full-stack internal video sharing platform with React frontend and Node.js backend; developed REST APIs and reusable UI components using JavaScript, HTML5, and CSS3',
      'Engineered data pipelines achieving sub-5 second video upload and retrieval; contributed to code reviews in an Agile/Scrum environment using Git',
    ],
  },
  {
    role: 'PeoplePerHour - Front End Developer',
    date: 'Feb 2020 - May 2023',
    bullets: [
      'Delivered 200+ client web applications using HTML5, CSS3, and JavaScript; maintained a 95% client satisfaction rate through iterative design and strong communication',
    ],
  },
]

export const INTERESTS = [
  'Web Development',
  'Cybersecurity Research',
  'Full-Stack Engineering',
  'AI / ML & Simulation',
]

export const SKILL_CATEGORIES = [
  {
    title: 'Languages',
    skills: ['JavaScript', 'TypeScript', 'Python', 'C#', 'Java', 'C++', 'SQL', 'HTML5', 'CSS3', 'Assembly'],
  },
  {
    title: 'Frontend',
    skills: ['React', 'Vite', 'TypeScript', 'GraphQL', 'Recharts', 'Leaflet'],
  },
  {
    title: 'Backend & APIs',
    skills: ['Node.js', 'FastAPI', '.NET', 'REST APIs', 'WebSocket', 'API development'],
  },
  {
    title: 'Databases & Cloud',
    skills: ['PostgreSQL', 'SQL Server', 'Azure', 'AWS', 'Netlify', 'Render'],
  },
  {
    title: 'DevOps & Tools',
    skills: ['Git', 'Docker', 'Azure DevOps', 'CI/CD', 'Auth0', 'Agile', 'Scrum'],
  },
]

export const PROJECTS = [
  {
    title: 'HomeNode [PickHacks 26 Winner]',
    description:
      'Built a mobile-first smart energy arbitrage platform combining household battery insights, local weather, and grid-intensity signals to convert homes into nano data centers. Developed AI-assisted job scheduling with a secure FastAPI backend (server-side API keys, fallback logic) and deployed a production stack on Netlify and Render. Implemented modular data hooks and personalized controls (location, units, battery profile, automation) for real-time dashboards tracking energy impact and revenue.',
    tech: ['React', 'Vite', 'FastAPI', 'Python', 'Auth0', 'Leaflet'],
    live: { label: 'homenode.netlify.app', url: 'https://homenode.netlify.app/' },
    repo: { label: 'github.com/Harsh-Aaryan/EcoAI', url: 'https://github.com/Harsh-Aaryan/EcoAI' },
  },
  {
    title: 'AutoTrader',
    description:
      'Developed an automated stock trading bot with real-time trading, position monitoring, and loop offset strategies. Integrated a Telegram bot with encrypted messaging and a remote kill switch. Implemented multi-threading for concurrent market data processing via WebSocket, Monte Carlo backtesting, and AWS Secrets Manager for secure API key management.',
    tech: ['Python', 'Alpaca API', 'Telegram Bot', 'Docker', 'AWS'],
  },
  {
    title: 'Canvas-RPG [2nd Place, PickHacks 25]',
    description:
      'Built a Chrome extension and Progressive Web App converting Canvas LMS into an RPG-styled game using the Canvas API for personalized quests. Achieved 700+ downloads on the Chrome Web Store.',
    tech: ['React', 'Python', 'JavaScript', 'GraphQL', 'Canvas API', 'Chrome Extension'],
    repo: { label: 'github.com/Harsh-Aaryan/canvas-rpg', url: 'https://github.com/Harsh-Aaryan/canvas-rpg' },
  },
  {
    title: 'AI-Music Discord Bot',
    description:
      "Created an AI-powered Discord bot for generating music using Suno LLM. Integrated Suno's sound generation API, deploying it on Vercel due to limited API availability. Utilized Postman for API testing and debugging, ensuring seamless communication between the bot and the sound generation service.",
    tech: ['Python', 'REST API', 'Vercel', 'Postman'],
  },
  {
    title: 'Smart Cart',
    description:
      'Designed and implemented a fully functional Smart Cart store checkout system with integrated front-end and back-end components. Made use of PostgreSQL database for product management; a C++ backend optimized for performance and memory; and an HTML, CSS, and JavaScript front-end enabling user checkout, payment, and order processing.',
    tech: ['C++', 'PostgreSQL', 'HTML/CSS', 'JavaScript'],
  },
]

export const CONTACT_PITCH = [
  "Let's build something amazing together!",
  "I'm always open to:",
  'Software Engineering Opportunities',
  'Full-stack Development Projects',
  'Open Source Contributions',
  'Tech Discussions',
]

export const SECTIONS = [
  { id: 'about', title: 'ABOUT.TXT', icon: 'file', kind: 'window' },
  { id: 'projects', title: 'PROJECTS/', icon: 'folder', kind: 'window' },
  { id: 'skills', title: 'SKILLS.SYS', icon: 'file', kind: 'window' },
  { id: 'resume', title: 'RESUME.PDF', icon: 'doc', kind: 'window' },
  { id: 'contact', title: 'LINKS.LNK', icon: 'link', kind: 'window' },
  { id: 'credits', title: 'CREDITS.TXT', icon: 'file', kind: 'window' },
]

export const BOOT_LINES = [
  'IBM 5151 COMPATIBLE BIOS',
  'COPYRIGHT (C) HARSH.OS 2026',
  '',
  'CPU: 8088-COMPATIBLE @ 4.77 MHz',
  'MEMORY TEST: 640K OK',
  'MEMORY COUNT: 640K BASE / 384K EXT',
  '',
  'DETECTING DISPLAY........ AMBER PHOSPHOR',
  'LOADING HARSH.OS ........ OK',
  'MOUNTING PORTFOLIO.FS ... OK',
  '',
  'PRESS ANY KEY TO LOG ON',
]

export const SCENE_CREDITS = [
  {
    title: 'Television 02',
    author: 'Benny Weimer',
    source: 'https://polyhaven.com/a/television_02',
    license: 'CC0 1.0',
    note: 'Photoreal vintage CRT (meshopt + WebP ≤1K)',
  },
  {
    title: 'Unfinished Office Night HDRI',
    author: 'Sergej Majboroda',
    source: 'https://polyhaven.com/a/unfinished_office_night',
    license: 'CC0 1.0',
    note: 'Night office reflections (1K JPEG env)',
  },
  {
    title: 'Modern Buildings Night',
    author: 'Greg Zaal',
    source: 'https://polyhaven.com/a/modern_buildings_night',
    license: 'CC0 1.0',
    note: 'Window city-glow backplate',
  },
  {
    title: 'Dark Wood',
    author: 'Dario Barresi, Dimitrios Savva, Rico Cilliers',
    source: 'https://polyhaven.com/a/dark_wood',
    license: 'CC0 1.0',
    note: 'Desk PBR',
  },
  {
    title: 'Painted Plaster Wall',
    author: 'Amal Kumar',
    source: 'https://polyhaven.com/a/painted_plaster_wall',
    license: 'CC0 1.0',
    note: 'Room walls',
  },
]
