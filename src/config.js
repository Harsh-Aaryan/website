/**
 * HARSH.OS visual and motion settings.
 * Change phosphor colors, CRT intensity, and intro timing here.
 */
export const THEMES = {
  amber: {
    id: 'amber',
    screenBg: '#0E0A05',
    text: '#FFB000',
    dim: '#B37A00',
    muted: '#5C3F0A',
    accent: '#FFD27A',
    glow: 'rgba(255, 176, 0, 0.35)',
    scanline: 'rgba(255, 176, 0, 0.07)',
  },
  green: {
    id: 'green',
    screenBg: '#050A06',
    text: '#33FF66',
    dim: '#1FA344',
    muted: '#0B4A1E',
    accent: '#33FF66',
    glow: 'rgba(51, 255, 102, 0.35)',
    scanline: 'rgba(51, 255, 102, 0.07)',
  },
}

export const ROOM = {
  dark: '#07090C',
  light: '#121418',
  wood: '#2A1A10',
  woodGrain: '#1A1008',
  plastic: '#C9B48A',
  plasticShade: '#A8946C',
  plasticHighlight: '#E2D3B0',
  coolKey: '#8FB4C9',
}

export const EFFECTS = {
  scanlineSizePx: 2,
  scanlineOpacity: 0.07,
  glowShadow: '0 0 2px var(--glow), 0 0 8px var(--glow)',
  chromaticPx: 0.5,
  flickerMin: 0.992,
  flickerMax: 1,
  vignette: 0.32,
  barrel: 0.08,
  windowShadow: '4px 4px 0 var(--muted)',
}

export const TIMING = {
  loadingMinMs: 700,
  bootLineMs: 110,
  bootHoldMs: 280,
  zoomMs: 2600,
  zoomOutMs: 1800,
  zoomWatchMs: 4000,
  crossfadeMs: 420,
  handoffFlashMs: 180,
  humGain: 0.012,
  humFreq: 58,
}

export const STORAGE = {
  skipIntro: 'harsh-os-skip-intro',
  theme: 'harsh-os-theme',
  muted: 'harsh-os-muted',
}

export const BREAKPOINT_MOBILE = 768

export function applyTheme(themeId) {
  const theme = THEMES[themeId] || THEMES.amber
  const root = document.documentElement
  root.dataset.theme = theme.id
  root.style.setProperty('--screen-bg', theme.screenBg)
  root.style.setProperty('--text-primary', theme.text)
  root.style.setProperty('--text-dim', theme.dim)
  root.style.setProperty('--muted', theme.muted)
  root.style.setProperty('--accent', theme.accent)
  root.style.setProperty('--glow', theme.glow)
  root.style.setProperty('--scanline', theme.scanline)
  root.style.setProperty('--shadow-color', theme.muted)
  return theme
}

export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function isMobileViewport() {
  return window.matchMedia(`(max-width: ${BREAKPOINT_MOBILE}px)`).matches
}

/** Phones / coarse-pointer portrait, including desktop-site and pre-viewport paints. */
export function isPhoneLike() {
  const shortest = Math.min(window.innerWidth || 0, window.innerHeight || 0)
  const coarse = window.matchMedia('(pointer: coarse)').matches
  const noHover = window.matchMedia('(hover: none)').matches
  const touch = (navigator.maxTouchPoints || 0) > 0
  if (shortest > 0 && shortest <= BREAKPOINT_MOBILE) return true
  if ((coarse || noHover || touch) && shortest > 0 && shortest <= 920) return true
  return isMobileViewport()
}

export function hasWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(
      canvas.getContext('webgl2') ||
        canvas.getContext('webgl') ||
        canvas.getContext('experimental-webgl')
    )
  } catch {
    return false
  }
}

export function shouldUse3D() {
  const params = new URLSearchParams(window.location.search)
  if (params.get('flat') === '1') return false
  if (params.get('force3d') === '1') return hasWebGL()
  if (prefersReducedMotion()) return false
  if (isPhoneLike()) return false
  return hasWebGL()
}
