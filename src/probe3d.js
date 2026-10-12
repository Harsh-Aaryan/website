import { isGlAlive, shieldWebGL } from './glSafe'

/**
 * Cheap capability probe used before mounting 3D, especially on phones.
 * Reduced-motion and ?flat=1 are handled in shouldUse3D().
 */

export function probeWebGL2() {
  try {
    const canvas = document.createElement('canvas')
    const strict = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true })
    if (isGlAlive(strict)) {
      shieldWebGL(strict)
      strict.getExtension('WEBGL_lose_context')?.loseContext()
      return { ok: true, caveat: false }
    }
    const loose = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false })
    if (!isGlAlive(loose)) return { ok: false, caveat: true }
    shieldWebGL(loose)
    loose.getExtension('WEBGL_lose_context')?.loseContext()
    return { ok: true, caveat: true }
  } catch {
    return { ok: false, caveat: true }
  }
}

export function hasEnoughMemory() {
  const mem = navigator.deviceMemory
  if (typeof mem !== 'number' || Number.isNaN(mem)) return true
  return mem >= 3
}

export function canAttemptPhone3D() {
  const params = new URLSearchParams(window.location.search)
  if (params.get('flat') === '1') return false
  if (params.get('force3d') === '1') {
    return probeWebGL2().ok || Boolean(window.WebGLRenderingContext)
  }
  if (!hasEnoughMemory()) return false
  const probe = probeWebGL2()
  return probe.ok && !probe.caveat
}
