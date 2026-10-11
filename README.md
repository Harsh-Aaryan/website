# Harsh Aaryan — CS Portfolio

Vintage CRT portfolio for **Harsh Aaryan**. The site opens on a 5151-style amber monitor (desk scene on desktop, flat bezel on mobile), runs a short HARSH.OS boot, then dollies into the glass. After the handoff you are inside a one-bit amber desktop: icons, windows, and a taskbar.

Live: [https://harshaaryan.netlify.app](https://harshaaryan.netlify.app)

Page title: `Harsh Aaryan - CS Portfolio`

## Run locally

Requires Node.js 20+.

```bash
npm install
npm run dev
```

Vite serves the app at `http://localhost:5173`.

```bash
npm run build      # production bundle → dist/
npm run preview    # serve the dist/ build
```

## Deploy on Netlify

This repo already includes `netlify.toml`:

| Setting | Value |
| --- | --- |
| Build command | `npm install && npm run build` |
| Publish directory | `dist` |
| Node | 20 |

Connect the GitHub repo in Netlify (or run `netlify deploy --prod --dir=dist` after a local build). SPA routes rewrite to `index.html`.

Resume PDF is served from `public/Harsh_Aaryan_Resume.pdf`.

## What is configurable

All phosphor colors, CRT intensity, boot/zoom timing, and storage keys live in `src/config.js`.

- Amber (default): `#0E0A05` / `#FFB000` / `#B37A00` / `#5C3F0A`, link accent `#FFD27A`
- Green alternative: `#050A06` / `#33FF66` / `#1FA344` / `#0B4A1E`

Copy (bio, jobs, projects, skills, links) is in `src/content.js` only.

Returning visitors who finish or skip the intro are sent straight to the desktop (`localStorage` key `harsh-os-skip-intro`). Theme and mute are remembered the same way.

`prefers-reduced-motion` skips the dolly, flicker, and boot typing.

## 3D landing assets

The desktop intro is a photoreal CRT product shot. Models and textures are **CC0 1.0** from [Poly Haven](https://polyhaven.com/). Full notes: `public/assets/scene/ATTRIBUTION.txt`. Credits also appear in ABOUT.TXT.

| Asset | Author | Source | License | In repo |
| --- | --- | --- | --- | --- |
| Television 02 (vintage CRT) | Benny Weimer | https://polyhaven.com/a/television_02 | CC0 1.0 | `public/assets/scene/television_02.glb` (2K PBR, WebP textures, ~420KB) |
| Moonless Golf HDRI | Greg Zaal | https://polyhaven.com/a/moonless_golf | CC0 1.0 | `public/assets/scene/moonless_golf_1k.hdr` |
| Wood Table Worn | Dimitrios Savva | https://polyhaven.com/a/wood_table_worn | CC0 1.0 | `public/assets/scene/wood_table_worn_*_1k.webp` |

Mobile, `prefers-reduced-motion`, and no-WebGL still use the flat CRT fallback. The Three.js scene is lazy-loaded behind the HARSH.OS boot progress bar.

## Layout

```
src/config.js                 visual + motion settings
src/content.js                portfolio copy
src/App.jsx                   boot → zoom → OS
src/components/CRTScene.jsx   lazy-loaded Three.js desk + monitor
src/components/FlatCRT.jsx    2D bezel fallback / mobile
src/components/OperatingSystem.jsx
src/components/sections/      About, Projects, Skills, Resume, Contact
```
