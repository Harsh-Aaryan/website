# Harsh Aaryan - CS Portfolio

A vintage CRT monitor-themed portfolio website featuring a 3D IBM 5151-style monitor interface with amber phosphor display aesthetics.

## Live Site

🌐 [https://harshaaryan.netlify.app](https://harshaaryan.netlify.app)

## Design Concept

The site opens with a 3D vintage CRT monitor in a moody desk scene. After a brief boot sequence, the camera zooms into the screen, transitioning seamlessly into an interactive portfolio interface styled as a retro operating system (HARSH.OS) with:

- **Amber phosphor CRT aesthetic** with scanlines, subtle glow, and screen curvature
- **Window-based interface** with Mac System 6/Windows 3.1-inspired chrome
- **Taskbar navigation** with tabs for each section
- **Draggable windows** displaying About, Projects, Skills, and Contact sections
- **Green alternative theme** toggle (amber/green phosphor modes)
- **Accessibility features** including skip intro, keyboard navigation, and reduced motion support

## Tech Stack

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **Three.js + React Three Fiber** - 3D CRT monitor scene
- **React Three Drei** - Three.js helpers
- **IBM Plex Mono** - Body text font (Google Fonts)
- **VT323** - Pixel-style headings font (Google Fonts)

## Local Development

### Prerequisites

- Node.js 20 or higher
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/Harsh-Aaryan/[repo-name].git
cd [repo-name]

# Install dependencies
npm install

# Start development server
npm run dev
```

The site will be available at `http://localhost:5173`

### Development Scripts

```bash
# Start dev server with hot reload
npm run dev

# Build for production
npm run build

# Preview production build locally
npm run preview
```

## Project Structure

```
/
├── public/                      # Static assets
│   └── Harsh_Aaryan_Resume.pdf
├── src/
│   ├── components/
│   │   ├── sections/           # Content sections
│   │   │   ├── AboutSection.jsx
│   │   │   ├── ProjectsSection.jsx
│   │   │   ├── SkillsSection.jsx
│   │   │   ├── ContactSection.jsx
│   │   │   └── Section.css
│   │   ├── BootSequence.jsx    # Boot animation
│   │   ├── CRTMonitor.jsx      # 3D monitor scene
│   │   ├── Portfolio.jsx       # Main portfolio UI
│   │   ├── Taskbar.jsx         # Bottom taskbar
│   │   └── Window.jsx          # Draggable window component
│   ├── styles/
│   │   ├── global.css          # Global styles and CSS variables
│   │   └── App.css             # App-level styles
│   ├── App.jsx                 # Main app component
│   └── main.jsx                # React entry point
├── index.html
├── package.json
├── vite.config.js
└── netlify.toml                # Netlify deployment config
```

## Deployment to Netlify

### Automatic Deployment (Recommended)

This site is configured for automatic deployment on Netlify via Git:

1. **Connect your repository** to Netlify
2. **Build settings** are already configured in `netlify.toml`:
   - Build command: `npm install && npm run build`
   - Publish directory: `dist`
   - Node version: 20

Netlify will automatically build and deploy on every push to the main branch.

### Manual Deployment

```bash
# Install Netlify CLI globally
npm install -g netlify-cli

# Build the site
npm run build

# Deploy to Netlify
netlify deploy --prod --dir=dist
```

### Environment Variables

No environment variables are required for basic functionality. All content is statically built.

## Design Features

### Color Schemes

**Amber Phosphor (Default)**
- Screen background: `#0E0A05`
- Primary text: `#FFB000`
- Dim text: `#B37A00`
- Muted/borders: `#5C3F0A`
- Accent links: `#FFD27A`

**Green Phosphor (Alternative)**
- Screen background: `#050A06`
- Primary text: `#33FF66`
- Dim text: `#1FA344`
- Muted/borders: `#0B4A1E`
- Accent links: `#7FFF99`

Toggle between themes using the A/G button in the taskbar.

### Accessibility

- **Skip intro button** - Bypass boot sequence
- **Remembers preference** - Uses localStorage to skip intro on return visits
- **Keyboard navigation** - Full keyboard support for all interactive elements
- **Reduced motion** - Respects `prefers-reduced-motion` to disable animations
- **Semantic HTML** - Proper heading hierarchy and ARIA labels
- **Screen reader friendly** - All interactive elements have descriptive labels

### Browser Compatibility

- **Modern browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **WebGL support required** for 3D monitor scene
- **Fallback**: Mobile devices and older browsers see a flat 2D experience

## Performance Optimizations

- Lazy-loaded 3D assets
- Compressed Three.js bundle
- Efficient React rendering with proper memoization
- Minimal external dependencies
- Optimized for Core Web Vitals

## Content Updates

To update portfolio content, edit the section components in `src/components/sections/`:

- **About** - Education, experience, interests
- **Projects** - Project cards with descriptions, tech stacks, and links
- **Skills** - Categorized skill lists
- **Contact** - Contact information and social links

All content is currently hardcoded in the components for maximum performance.

## Credits

**Design & Development**: Harsh Aaryan  
**Fonts**: IBM Plex Mono, VT323 (Google Fonts)  
**3D Library**: Three.js  
**React Framework**: React 18  
**Build Tool**: Vite  

Inspired by vintage IBM 5151 and Apple Monitor III CRT displays, Mac System 6 Finder, Windows 3.1 Program Manager, and cool-retro-term.

## License

© 2026 Harsh Aaryan. All rights reserved.

## Contact

- **Email**: harsharyan4@gmail.com
- **GitHub**: [@Harsh-Aaryan](https://github.com/Harsh-Aaryan)
- **Website**: [harshaaryan.tech](https://harshaaryan.tech)
