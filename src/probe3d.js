import { isGlAlive, shieldWebGL } from './glSafe'

/**
 * Cheap capability probe used before mounting 3D, especially on phones.
 * Reduced-motion and ?flat=1 are handled in shouldUse3D().
 */

let softwareCached = null

export function readRendererInfo(ctx) {
  try {
    const ext = ctx?.getExtension?.('WEBGL_debug_renderer_info')
    if (!ext) return { vendor: '', renderer: '' }
    return {
      vendor: String(ctx.getParameter(ext.UNMASKED_VENDOR_WEBGL) || ''),
      renderer: String(ctx.getParameter(ext.UNMASKED_RENDERER_WEBGL) || ''),
    }
  } catch {
    return { vendor: '', renderer: '' }
  }
}

export function isSoftwareRasterizer(info = {}) {
  const blob = `${info.renderer || ''} ${info.vendor || ''}`
  return /swiftshader|llvmpipe|softpipe|software|microsoft basic render/i.test(blob)
}

export function detectSoftwareGL() {
  if (softwareCached != null) return softwareCached
  try {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('webgl2') || canvas.getContext('webgl')
    if (!isGlAlive(ctx)) {
      softwareCached = false
      return false
    }
    const info = readRendererInfo(ctx)
    softwareCached = isSoftwareRasterizer(info)
    ctx.getExtension('WEBGL_lose_context')?.loseContext()
    return softwareCached
  } catch {
    softwareCached = false
    return false
  }
}

export function probeWebGL2() {
  try {
    const canvas = document.createElement('canvas')
    const strict = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: true })
    if (isGlAlive(strict)) {
      const info = readRendererInfo(strict)
      const software = isSoftwareRasterizer(info)
      if (softwareCached == null) softwareCached = software
      shieldWebGL(strict)
      strict.getExtension('WEBGL_lose_context')?.loseContext()
      return { ok: true, caveat: false, software, renderer: info.renderer }
    }
    const loose = canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false })
    if (!isGlAlive(loose)) return { ok: false, caveat: true, software: detectSoftwareGL() }
    const info = readRendererInfo(loose)
    const software = isSoftwareRasterizer(info)
    if (softwareCached == null) softwareCached = software
    shieldWebGL(loose)
    loose.getExtension('WEBGL_lose_context')?.loseContext()
    return { ok: true, caveat: true, software, renderer: info.renderer }
  } catch {
    return { ok: false, caveat: true, software: detectSoftwareGL() }
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
