#!/usr/bin/env node
/**
 * Deterministic zoom-trigger stress: 20 out/in cycles on phone-flat,
 * phone-3d, and desktop-site (3D) profiles, plus reverse / fallback suites.
 * Synthetic pointer events + 4x CPU.
 * Fails loudly if any trigger does not reach its target stage within 2.5s.
 */
import { spawn } from 'node:child_process'
import { chromium } from 'playwright-core'
import { preview } from 'vite'

const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome'
const CYCLES = Number(process.env.ZOOM_CYCLES || 20)
const LIMIT_MS = 2500
const PHONE_UA =
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Mobile Safari/537.36'
const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36'

const PROFILES = [
  {
    name: 'phone-flat',
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: PHONE_UA,
    expectDisplay: 'flat',
    reverse: false,
    search: 'flat=1',
  },
  {
    name: 'phone-flat-reverse',
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: PHONE_UA,
    expectDisplay: 'flat',
    reverse: true,
    search: 'flat=1',
  },
  {
    name: 'phone-3d',
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: PHONE_UA,
    expectDisplay: '3d',
    reverse: false,
    search: 'force3d=1',
    mixTriggers: true,
    extras: true,
    cpu: 4,
  },
  {
    name: 'phone-3d-1x',
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: PHONE_UA,
    expectDisplay: '3d',
    reverse: false,
    search: 'force3d=1',
    mixTriggers: true,
    hold3d: true,
    cpu: 1,
  },
  {
    name: 'desktop-site-3d',
    viewport: { width: 980, height: 2100 },
    deviceScaleFactor: 2.6,
    isMobile: false,
    hasTouch: true,
    userAgent: DESKTOP_UA,
    expectDisplay: '3d',
    reverse: false,
  },
]

function log(line) {
  process.stdout.write(`${line}\n`)
}

async function waitForDist() {
  if (process.env.SKIP_BUILD === '1') return
  await new Promise((resolve, reject) => {
    const child = spawn('npm', ['run', 'build'], { stdio: 'inherit' })
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`build ${code}`))))
  })
}

async function debug(page) {
  return page.evaluate(() => window.__crtDebug || null)
}

async function synthPointer(page, selectorOrFn, label) {
  const ok = await page.evaluate((sel) => {
    const el =
      typeof sel === 'string'
        ? sel === '__parked__'
          ? document.querySelector('.scene-recover') ||
            document.querySelector('.boot-screen.is-parked') ||
            document.querySelector('#os-main')
          : sel === '__menu-zoom__'
            ? [...document.querySelectorAll('.start-menu button')].find((btn) =>
                /zoom out/i.test(btn.textContent || '')
              )
            : document.querySelector(sel)
        : null
    if (!el) return false
    const r = el.getBoundingClientRect()
    const x = r.left + Math.max(1, r.width) / 2
    const y = r.top + Math.max(1, r.height) / 2
    const opts = {
      bubbles: true,
      cancelable: true,
      composed: true,
      pointerType: 'touch',
      pointerId: 1,
      clientX: x,
      clientY: y,
    }
    const top = document.elementFromPoint(x, y)
    if (top && top !== el && !el.contains(top) && !top.closest?.('.start-menu') && !top.closest?.('.zoom-out-btn')) {
      throw new Error(`covered by ${top.className || top.tagName}`)
    }
    el.dispatchEvent(new PointerEvent('pointerdown', opts))
    el.dispatchEvent(new PointerEvent('pointerup', opts))
    el.dispatchEvent(new MouseEvent('click', { ...opts, button: 0 }))
    return true
  }, selectorOrFn)
  if (!ok) throw new Error(`synthetic pointer missed ${label || selectorOrFn}`)
}

async function waitStage(page, want, ms = LIMIT_MS) {
  const t0 = Date.now()
  try {
    await page.waitForFunction(
      (stage) => {
        const d = window.__crtDebug
        return Boolean(d && d.stage === stage && d.lock === false)
      },
      want,
      { timeout: ms, polling: 16 }
    )
  } catch {
    const last = await debug(page)
    throw new Error(`FAIL did not reach ${want} within ${ms}ms last=${JSON.stringify(last)}`)
  }
  return Date.now() - t0
}

async function waitReady(page, profile) {
  const bootMs = await waitStage(page, 'os', 20000)
  const display = await page.evaluate(() => window.__crtDebug?.display)
  if (display !== profile.expectDisplay) {
    throw new Error(`FAIL ${profile.name} display=${display} expected ${profile.expectDisplay}`)
  }
  if (profile.expectDisplay === '3d') {
    await page.waitForFunction(
      () =>
        Boolean(
          window.__glassMetrics &&
            document.querySelector('.scene-canvas.is-ready') &&
            window.__crtWarmed
        ),
      null,
      { timeout: 20000, polling: 50 }
    )
    if (profile.extras) {
      const info = await page.evaluate(() => {
        const os = document.querySelector('.flat-os-bezel .os-root') || document.querySelector('.os-root')
        const r = os?.getBoundingClientRect()
        return {
          lite: window.__crtDebug?.lite,
          osFrame: window.__crtDebug?.osFrame,
          height: r?.height || 0,
        }
      })
      if (!info.lite) throw new Error(`FAIL ${profile.name} expected lite 3D`)
      if (info.osFrame !== 'bezel') throw new Error(`FAIL ${profile.name} osFrame=${info.osFrame}`)
      if (info.height < 600) throw new Error(`FAIL ${profile.name} OS height ${info.height} < 600`)
    }
  }
  return { bootMs, display }
}

function profileUrl(base, profile) {
  const url = new URL(base)
  if (profile.search) {
    const extra = new URLSearchParams(profile.search)
    extra.forEach((value, key) => url.searchParams.set(key, value))
  }
  return url.toString()
}

async function openStartMenu(page) {
  await synthPointer(page, '.start-button', 'start menu')
  await page.waitForFunction(
    () => {
      const menu = document.querySelector('.start-menu')
      const r = menu?.getBoundingClientRect()
      return Boolean(r && r.width > 40 && r.height > 40)
    },
    null,
    { timeout: LIMIT_MS, polling: 16 }
  )
}

async function triggerZoomOut(page, cycle, profile) {
  const useMenu =
    profile.mixTriggers || profile.expectDisplay !== '3d' ? cycle % 2 === 1 : false
  if (useMenu) {
    await openStartMenu(page)
    await synthPointer(page, '__menu-zoom__', 'Shut down / Zoom out')
    return 'menu'
  }
  await synthPointer(page, '.zoom-out-btn', 'tray zoom out')
  return 'tray'
}

async function openSixWindows(page) {
  await page.evaluate(() => {
    document.querySelectorAll('[data-icon]').forEach((el) => el.click())
  })
  const count = await page.evaluate(() => document.querySelectorAll('.window').length)
  if (count < 6) throw new Error(`FAIL expected 6 windows, got ${count}`)
}

async function runCycles(page, profile) {
  const cycles = []
  for (let i = 1; i <= CYCLES; i += 1) {
    const via = await triggerZoomOut(page, i, profile)
    if (profile.mixTriggers && i % 4 === 0) {
      await synthPointer(page, '.zoom-out-btn', 'double-tap zoom out')
    }
    const outMs = await waitStage(page, 'parked')
    if (outMs >= LIMIT_MS) throw new Error(`FAIL SLOW ${profile.name} #${i} ${via} out=${outMs}ms`)
    await synthPointer(page, '__parked__', 'parked zoom in')
    if (profile.mixTriggers && i % 4 === 0) {
      await synthPointer(page, '__parked__', 'double-tap PRESS ANY KEY')
    }
    const inMs = await waitStage(page, 'os')
    if (inMs >= LIMIT_MS) throw new Error(`FAIL SLOW ${profile.name} #${i} ${via} in=${inMs}ms`)
    if (profile.hold3d) {
      const display = await page.evaluate(() => window.__crtDebug?.display)
      if (display !== '3d') {
        throw new Error(`FAIL ${profile.name} #${i} dropped to display=${display}`)
      }
    }
    cycles.push({ cycle: i, via, outMs, inMs })
    log(`  ${profile.name} #${i} ${via} out=${outMs}ms in=${inMs}ms`)
  }
  return cycles
}

async function runPhone3dExtras(page, profile) {
  await synthPointer(page, '.zoom-out-btn', 'extras to parked')
  await waitStage(page, 'parked')
  await synthPointer(page, '__parked__', 'start zoom in for mid-zoom reverse')
  await page.waitForFunction(
    () => window.__crtDebug?.running === true && window.__crtDebug?.target === 'os',
    null,
    { timeout: LIMIT_MS, polling: 16 }
  )
  await page.keyboard.press('Escape')
  const reverseOut = await waitStage(page, 'parked')
  if (reverseOut >= LIMIT_MS) throw new Error(`FAIL SLOW ${profile.name} mid-zoom reverse ${reverseOut}ms`)
  log(`  ${profile.name} extra mid-zoom reverse ${reverseOut}ms`)

  await synthPointer(page, '__parked__', 'return os before hide')
  await waitStage(page, 'os')
  await synthPointer(page, '.zoom-out-btn', 'zoom out then background')
  await page.waitForFunction(
    () => window.__crtDebug?.running === true,
    null,
    { timeout: LIMIT_MS, polling: 16 }
  )
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => 'hidden',
    })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  const hideMs = await waitStage(page, 'parked')
  if (hideMs >= LIMIT_MS) throw new Error(`FAIL SLOW ${profile.name} background snap ${hideMs}ms`)
  log(`  ${profile.name} extra background snap ${hideMs}ms`)

  const draws = await page.evaluate(() => window.__crtDebug?.draws || window.__crtDraws || 0)
  if (draws > 120) throw new Error(`FAIL ${profile.name} draw calls ${draws} > 120`)
  log(`  ${profile.name} draws=${draws}`)

  await page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl')
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
  })
  await page.waitForFunction(
    () => window.__crtDebug?.display === 'flat',
    null,
    { timeout: 4000, polling: 16 }
  )
  log(`  ${profile.name} extra context-loss → flat`)
}

async function runReverse(page, profile) {
  await openSixWindows(page)
  const cycles = []
  for (let i = 1; i <= CYCLES; i += 1) {
    await synthPointer(page, '.zoom-out-btn', 'tray to parked')
    await waitStage(page, 'parked')
    await synthPointer(page, '__parked__', 'start zoom in')
    await page.waitForFunction(
      () => window.__crtDebug?.running === true && window.__crtDebug?.target === 'os',
      null,
      { timeout: LIMIT_MS, polling: 16 }
    )
    const t0 = Date.now()
    const via = i % 2 === 1 ? 'escape' : 'tray'
    if (via === 'escape') {
      await page.keyboard.press('Escape')
    } else {
      await page.waitForFunction(
        () => {
          const btn = document.querySelector('.zoom-out-btn')
          const r = btn?.getBoundingClientRect()
          return Boolean(r && r.width > 8 && r.height > 8)
        },
        null,
        { timeout: LIMIT_MS, polling: 16 }
      )
      await synthPointer(page, '.zoom-out-btn', 'mid-zoom tray reverse')
    }
    const outMs = await waitStage(page, 'parked')
    if (outMs >= LIMIT_MS) {
      throw new Error(`FAIL SLOW reverse ${profile.name} #${i} ${via} ${outMs}ms`)
    }
    cycles.push({ cycle: i, via: `reverse-${via}`, outMs, inMs: 0 })
    log(`  ${profile.name} #${i} reverse-${via} parked=${outMs}ms`)
    await synthPointer(page, '__parked__', 'return to os')
    const inMs = await waitStage(page, 'os')
    if (inMs >= LIMIT_MS) throw new Error(`FAIL SLOW reverse return ${profile.name} #${i} in=${inMs}ms`)
    cycles[cycles.length - 1].inMs = inMs
  }
  return cycles
}

async function loseWebGL(page) {
  return page.evaluate(() => {
    let n = 0
    for (const canvas of document.querySelectorAll('canvas')) {
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
      const ext = gl?.__loseExt || gl?.getExtension?.('WEBGL_lose_context')
      try {
        ext?.loseContext()
        n += 1
      } catch {
        /* ignore */
      }
      canvas.dispatchEvent(new Event('webglcontextlost', { bubbles: true, cancelable: true }))
    }
    if (!n) window.dispatchEvent(new Event('webglcontextlost'))
    return n
  })
}

async function assertFlatVisible(page, label, pageErrors) {
  await page.waitForFunction(
    () => {
      const d = window.__crtDebug
      const main = document.querySelector('#os-main')
      const content =
        document.querySelector('.os-root') ||
        document.querySelector('.boot-screen') ||
        document.querySelector('.flat-os-bezel') ||
        document.querySelector('.flat-crt') ||
        document.querySelector('.flat-room')
      const r = content?.getBoundingClientRect()
      const mainR = main?.getBoundingClientRect()
      const text = (document.body.innerText || '').replace(/\s+/g, ' ').trim()
      return Boolean(
        d &&
          d.display === 'flat' &&
          main?.getAttribute('data-display') === 'flat' &&
          mainR &&
          mainR.height > 200 &&
          text.length > 8 &&
          (r ? r.width * r.height > 0 || text.length > 8 : true)
      )
    },
    null,
    { timeout: 5000, polling: 16 }
  )
  const dirty = pageErrors.filter((msg) => !/AbortError|The user aborted a request/i.test(msg))
  if (dirty.length) {
    throw new Error(`FAIL ${label} pageerror ${dirty.join(' | ')}`)
  }
}

async function openLossPage(browser, base, skipIntro) {
  const context = await browser.newContext({
    viewport: { width: 412, height: 915 },
    deviceScaleFactor: 3,
    isMobile: true,
    hasTouch: true,
    userAgent: PHONE_UA,
    reducedMotion: 'no-preference',
  })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  const cdp = await context.newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await page.addInitScript((skip) => {
    try {
      if (skip) localStorage.setItem('harsh-os-skip-intro', '1')
      else localStorage.removeItem('harsh-os-skip-intro')
      localStorage.setItem('harsh-os-muted', '1')
    } catch {
      /* ignore */
    }
  }, skipIntro)
  const url = new URL(base)
  url.searchParams.set('force3d', '1')
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 30000 })
  return { context, page, pageErrors }
}

async function runContextLossSuite(browser, base) {
  const cases = []

  {
    const { context, page, pageErrors } = await openLossPage(browser, base, false)
    await page.waitForFunction(() => Boolean(document.querySelector('canvas')), null, {
      timeout: 15000,
      polling: 16,
    })
    await page.waitForTimeout(40)
    await loseWebGL(page)
    await assertFlatVisible(page, 'loss-mount', pageErrors)
    log('  phone-3d-loss mount → flat')
    await context.close()
    cases.push({ name: 'mount', outMs: 0, inMs: 0 })
  }

  {
    const { context, page, pageErrors } = await openLossPage(browser, base, false)
    await page.waitForFunction(
      () => window.__crtDebug?.stage === 'boot' && document.querySelector('canvas'),
      null,
      { timeout: 15000, polling: 16 }
    )
    await page.waitForTimeout(80)
    await loseWebGL(page)
    await assertFlatVisible(page, 'loss-boot', pageErrors)
    log('  phone-3d-loss boot → flat')
    await context.close()
    cases.push({ name: 'boot', outMs: 0, inMs: 0 })
  }

  {
    const { context, page, pageErrors } = await openLossPage(browser, base, true)
    await waitStage(page, 'os', 20000)
    await synthPointer(page, '.zoom-out-btn', 'loss parked zoom out')
    await waitStage(page, 'parked')
    await loseWebGL(page)
    await assertFlatVisible(page, 'loss-parked', pageErrors)
    log('  phone-3d-loss parked → flat')
    await context.close()
    cases.push({ name: 'parked', outMs: 0, inMs: 0 })
  }

  {
    const { context, page, pageErrors } = await openLossPage(browser, base, true)
    await waitStage(page, 'os', 20000)
    await synthPointer(page, '.zoom-out-btn', 'loss dolly zoom out')
    await page.waitForFunction(() => window.__crtDebug?.running === true, null, {
      timeout: LIMIT_MS,
      polling: 16,
    })
    await loseWebGL(page)
    await assertFlatVisible(page, 'loss-dolly', pageErrors)
    log('  phone-3d-loss mid-dolly → flat')
    await context.close()
    cases.push({ name: 'dolly', outMs: 0, inMs: 0 })
  }

  return { name: 'phone-3d-loss', display: 'flat', bootMs: 0, cycles: cases, reverse: false, pageErrors: [] }
}

async function runProfile(browser, base, profile) {
  const context = await browser.newContext({
    viewport: profile.viewport,
    deviceScaleFactor: profile.deviceScaleFactor,
    isMobile: profile.isMobile,
    hasTouch: profile.hasTouch,
    userAgent: profile.userAgent,
    reducedMotion: 'no-preference',
  })
  const page = await context.newPage()
  const pageErrors = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  const cdp = await context.newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: profile.cpu || 4 })
  await page.addInitScript(() => {
    try {
      localStorage.setItem('harsh-os-skip-intro', '1')
      localStorage.setItem('harsh-os-muted', '1')
    } catch {
      /* ignore */
    }
  })

  await page.goto(profileUrl(base, profile), { waitUntil: 'domcontentloaded', timeout: 30000 })
  const { bootMs, display } = await waitReady(page, profile)
  const cycles = profile.reverse ? await runReverse(page, profile) : await runCycles(page, profile)
  if (profile.extras) {
    await runPhone3dExtras(page, profile)
  } else if (profile.expectDisplay === '3d' && !profile.reverse) {
    await synthPointer(page, '.zoom-out-btn', 'park for context-loss')
    await waitStage(page, 'parked')
    await page.evaluate(() => {
      const canvas = document.querySelector('canvas')
      const gl = canvas?.getContext('webgl2') || canvas?.getContext('webgl')
      gl?.getExtension('WEBGL_lose_context')?.loseContext()
    })
    await new Promise((resolve) => setTimeout(resolve, 600))
  }
  const trimErrors = pageErrors.filter((msg) => /trim|ShadowAlpha|Cannot read properties of null/i.test(msg))
  if (trimErrors.length) {
    throw new Error(`FAIL pageerror ${trimErrors.join(' | ')}`)
  }
  const dirty = pageErrors.filter((msg) => !/AbortError|The user aborted a request/i.test(msg))
  if (profile.extras && dirty.length) {
    throw new Error(`FAIL console ${dirty.join(' | ')}`)
  }
  await context.close()
  return { name: profile.name, display, bootMs, cycles, reverse: profile.reverse, pageErrors }
}

async function main() {
  await waitForDist()
  const server = await preview({
    preview: { host: '127.0.0.1', port: 4173, strictPort: false },
  })
  const base = server.resolvedUrls?.local?.[0] || 'http://127.0.0.1:4173/'
  log(`preview ${base}`)

  const browser = await chromium.launch({
    executablePath: CHROME,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--enable-webgl',
      '--ignore-gpu-blocklist',
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--enable-unsafe-swiftshader',
      '--hide-scrollbars',
    ],
  })

  const results = []
  const failures = []
  try {
    for (const profile of PROFILES) {
      log(
        `\n== ${profile.name} ${profile.viewport.width}x${profile.viewport.height} dpr=${profile.deviceScaleFactor} cpu=${profile.cpu || 4}x${profile.reverse ? ' reverse' : ''} ==`
      )
      try {
        results.push(await runProfile(browser, base, profile))
      } catch (error) {
        failures.push(`${profile.name}: ${error.message}`)
        log(`FAIL ${profile.name}: ${error.message}`)
      }
    }
    log(`\n== phone-3d-loss context-loss suite ==`)
    try {
      results.push(await runContextLossSuite(browser, base))
    } catch (error) {
      failures.push(`phone-3d-loss: ${error.message}`)
      log(`FAIL phone-3d-loss: ${error.message}`)
    }
  } finally {
    await browser.close()
    await server.close()
  }

  log('\n== summary ==')
  let total = 0
  for (const result of results) {
    const slow = result.cycles.filter((c) => c.outMs >= LIMIT_MS || c.inMs >= LIMIT_MS)
    const maxOut = result.cycles.length ? Math.max(...result.cycles.map((c) => c.outMs)) : 0
    const maxIn = result.cycles.length ? Math.max(...result.cycles.map((c) => c.inMs)) : 0
    total += result.cycles.length
    log(
      `${result.name} display=${result.display} boot=${result.bootMs}ms cycles=${result.cycles.length} maxOut=${maxOut}ms maxIn=${maxIn}ms`
    )
    if (slow.length) failures.push(`${result.name} slow cycles ${JSON.stringify(slow)}`)
  }

  if (failures.length) {
    log(`FAILED ${failures.length}`)
    for (const failure of failures) log(` - ${failure}`)
    process.exitCode = 1
    return
  }
  log(`PASS ${total}/${total} triggers reached target within 2.5s`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
