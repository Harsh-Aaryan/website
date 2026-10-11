#!/usr/bin/env node
/**
 * Deterministic zoom-trigger stress: 20 out/in cycles on phone (flat)
 * and desktop-site (3D) profiles. Synthetic pointer events + 4x CPU.
 * Fails if any trigger does not reach its target stage within 2.5s.
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
  },
  {
    name: 'desktop-site-3d',
    viewport: { width: 980, height: 2100 },
    deviceScaleFactor: 2.6,
    isMobile: false,
    hasTouch: true,
    userAgent: DESKTOP_UA,
    expectDisplay: '3d',
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
    if (top && top !== el && !el.contains(top) && !top.closest?.('.start-menu')) {
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
      { timeout: ms, polling: 50 }
    )
    await page.waitForFunction(
      (stage) => document.querySelector('#os-main')?.dataset.stage === stage,
      want,
      { timeout: Math.max(ms, 8000), polling: 50 }
    )
  } catch {
    const last = await debug(page)
    throw new Error(`did not reach ${want} within ${ms}ms last=${JSON.stringify(last)}`)
  }
  return Date.now() - t0
}

async function triggerZoomOut(page, cycle) {
  const useMenu = cycle % 2 === 1
  if (useMenu) {
    await synthPointer(page, '.start-button', 'start menu')
    await page.waitForSelector('.start-menu', { timeout: LIMIT_MS })
    await synthPointer(page, '__menu-zoom__', 'Shut down / Zoom out')
    return 'menu'
  }
  await synthPointer(page, '.zoom-out-btn', 'tray zoom out')
  return 'tray'
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
  const cdp = await context.newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  await page.addInitScript(() => {
    try {
      localStorage.setItem('harsh-os-skip-intro', '1')
      localStorage.setItem('harsh-os-muted', '1')
    } catch {
      /* ignore */
    }
  })

  const url = new URL(base)
  await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 30000 })
  const bootMs = await waitStage(page, 'os', 20000)
  const display = await page.evaluate(() => window.__crtDebug?.display)
  if (display !== profile.expectDisplay) {
    throw new Error(`${profile.name} display=${display} expected ${profile.expectDisplay}`)
  }

  const cycles = []
  for (let i = 1; i <= CYCLES; i += 1) {
    const via = await triggerZoomOut(page, i)
    const outMs = await waitStage(page, 'parked')
    await synthPointer(page, '__parked__', 'parked zoom in')
    const inMs = await waitStage(page, 'os')
    cycles.push({ cycle: i, via, outMs, inMs })
    log(`  ${profile.name} #${i} ${via} out=${outMs}ms in=${inMs}ms`)
  }

  await context.close()
  return { name: profile.name, display, bootMs, cycles }
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
      log(`\n== ${profile.name} ${profile.viewport.width}x${profile.viewport.height} dpr=${profile.deviceScaleFactor} cpu=4x ==`)
      try {
        results.push(await runProfile(browser, base, profile))
      } catch (error) {
        failures.push(`${profile.name}: ${error.message}`)
        log(`FAIL ${profile.name}: ${error.message}`)
      }
    }
  } finally {
    await browser.close()
    await server.close()
  }

  log('\n== summary ==')
  for (const result of results) {
    const slow = result.cycles.filter((c) => c.outMs >= LIMIT_MS || c.inMs >= LIMIT_MS)
    const maxOut = Math.max(...result.cycles.map((c) => c.outMs))
    const maxIn = Math.max(...result.cycles.map((c) => c.inMs))
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
  log('PASS 40/40 triggers reached target within 2.5s')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
