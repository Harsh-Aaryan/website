const DUMMY_PRECISION = { rangeMin: 1, rangeMax: 1, precision: 0 }

export function isGlAlive(glOrCtx) {
  try {
    const ctx = glOrCtx?.isWebGLRenderer ? glOrCtx.getContext?.() : glOrCtx
    return Boolean(ctx && typeof ctx.isContextLost === 'function' ? !ctx.isContextLost() : ctx)
  } catch {
    return false
  }
}

function wrap(ctx, name, fallback) {
  const orig = ctx[name]
  if (typeof orig !== 'function' || orig.__crtSafe) return
  const bound = orig.bind(ctx)
  const safe = (...args) => {
    try {
      if (ctx.isContextLost?.()) return fallback(...args)
      const value = bound(...args)
      return value == null ? fallback(...args) : value
    } catch {
      return fallback(...args)
    }
  }
  safe.__crtSafe = true
  ctx[name] = safe
}

/** Patch a WebGL context so capability reads never throw after loss. */
export function shieldWebGL(ctx) {
  if (!ctx || ctx.__crtShielded) return ctx
  ctx.__crtShielded = true
  try {
    ctx.__loseExt = ctx.getExtension('WEBGL_lose_context')
  } catch {
    ctx.__loseExt = null
  }
  wrap(ctx, 'getShaderPrecisionFormat', () => ({ ...DUMMY_PRECISION }))
  wrap(ctx, 'getParameter', () => null)
  wrap(ctx, 'getExtension', () => null)
  wrap(ctx, 'getSupportedExtensions', () => [])
  wrap(ctx, 'getContextAttributes', () => ({ alpha: false }))
  return ctx
}

export function readGlCaps(glOrCtx) {
  try {
    const ctx = glOrCtx?.isWebGLRenderer ? glOrCtx.getContext?.() : glOrCtx
    if (!isGlAlive(ctx)) return { ok: false, precision: 0 }
    shieldWebGL(ctx)
    const fmt = ctx.getShaderPrecisionFormat?.(ctx.FRAGMENT_SHADER, ctx.HIGH_FLOAT)
    const precision = fmt?.precision ?? 0
    ctx.getParameter?.(ctx.MAX_TEXTURE_SIZE)
    ctx.getExtension?.('EXT_texture_filter_anisotropic')
    return { ok: true, precision }
  } catch {
    return { ok: false, precision: 0 }
  }
}

export function createSafeRenderer(THREE, canvas, opts = {}) {
  const attrs = {
    antialias: Boolean(opts.antialias),
    alpha: opts.alpha ?? false,
    powerPreference: opts.powerPreference || 'default',
    stencil: false,
    depth: true,
    failIfMajorPerformanceCaveat: false,
  }
  let ctx = null
  try {
    ctx = canvas.getContext('webgl2', attrs) || canvas.getContext('webgl', attrs)
  } catch {
    ctx = null
  }
  if (!isGlAlive(ctx)) {
    const err = new Error('webgl-unavailable')
    err.code = 'WEBGL_LOST'
    throw err
  }
  shieldWebGL(ctx)
  const renderer = new THREE.WebGLRenderer({
    canvas,
    context: ctx,
    antialias: attrs.antialias,
    alpha: attrs.alpha,
    powerPreference: attrs.powerPreference,
    stencil: attrs.stencil,
    depth: attrs.depth,
  })
  if (opts.toneMapping != null) renderer.toneMapping = opts.toneMapping
  if (opts.toneMappingExposure != null) renderer.toneMappingExposure = opts.toneMappingExposure
  if (opts.outputColorSpace) renderer.outputColorSpace = opts.outputColorSpace
  return renderer
}

export function bindContextLoss(gl, onLost) {
  const canvas = gl?.domElement
  if (!canvas) return () => {}
  try {
    shieldWebGL(gl.getContext?.())
  } catch {
    /* already gone */
  }
  const handle = (event) => {
    event.preventDefault()
    try {
      gl.setAnimationLoop?.(null)
    } catch {
      /* ignore */
    }
    onLost?.()
  }
  canvas.addEventListener('webglcontextlost', handle, { once: true })
  return () => canvas.removeEventListener('webglcontextlost', handle)
}
