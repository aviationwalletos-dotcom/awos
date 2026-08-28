#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { cp, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const port = Number(process.env.SMOKE_REVEAL_PORT || 4179)
const baseUrl = `http://127.0.0.1:${port}`

async function main() {
  const { chromium } = await importPlaywright()
  const tempRoot = await mkdtemp(path.join(tmpdir(), 'react-no-build-reveal-'))
  const smokeRoot = path.join(tempRoot, 'app')
  let server
  let browser

  try {
    await createSmokeFixture(smokeRoot)
    server = startVite(smokeRoot)
    await waitForServer(baseUrl)

    browser = await chromium.launch()
    const contexts = [
      { width: 1280, height: 800 },
      { width: 390, height: 844 },
    ]

    for (const viewport of contexts) {
      await assertRevealFlow(browser, viewport)
    }

    console.log('Reveal smoke test passed')
  } finally {
    if (browser) {
      await browser.close()
    }
    if (server) {
      server.kill('SIGTERM')
    }
    await rm(tempRoot, { recursive: true, force: true })
  }
}

async function importPlaywright() {
  try {
    return await import('playwright')
  } catch (error) {
    console.error('Playwright is required. Run `pnpm install` and `pnpm exec playwright install chromium` first.')
    throw error
  }
}

async function createSmokeFixture(smokeRoot) {
  await mkdir(path.join(smokeRoot, 'src', 'hooks'), { recursive: true })
  await cp(path.join(projectRoot, 'src', 'index.css'), path.join(smokeRoot, 'src', 'index.css'))
  await cp(
    path.join(projectRoot, 'src', 'hooks', 'useRevealOnIntersect.ts'),
    path.join(smokeRoot, 'src', 'hooks', 'useRevealOnIntersect.ts'),
  )
  await writeFile(
    path.join(smokeRoot, 'index.html'),
    '<div id="root"></div><script type="module" src="/src/main.tsx"></script>\n',
    'utf-8',
  )
  await writeFile(
    path.join(smokeRoot, 'package.json'),
    JSON.stringify({ type: 'module', private: true }, null, 2),
    'utf-8',
  )
  await writeFile(
    path.join(smokeRoot, 'src', 'main.tsx'),
    smokeAppSource(),
    'utf-8',
  )
  await symlink(path.join(projectRoot, 'node_modules'), path.join(smokeRoot, 'node_modules'), 'dir')
}

function smokeAppSource() {
  return `
import React from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { useRevealOnIntersect } from './hooks/useRevealOnIntersect'

function App() {
  const topRef = useRevealOnIntersect<HTMLElement>()
  const belowRef = useRevealOnIntersect<HTMLElement>()

  return (
    <main style={{ minHeight: '2600px', padding: 24, position: 'relative' }}>
      <section ref={topRef} className="reveal" data-testid="top">
        Visible section
      </section>
      <section
        ref={belowRef}
        className="reveal"
        data-testid="below"
        style={{ display: 'block', minHeight: '120px', position: 'absolute', top: '2200px' }}
      >
        Below fold section
      </section>
    </main>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
`
}

function startVite(smokeRoot) {
  const viteBin = path.join(
    smokeRoot,
    'node_modules',
    '.bin',
    process.platform === 'win32' ? 'vite.cmd' : 'vite',
  )
  const server = spawn(
    viteBin,
    ['--host', '127.0.0.1', '--port', String(port), '--strictPort'],
    {
      cwd: smokeRoot,
      env: { ...process.env, FORCE_COLOR: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )

  server.stdout.on('data', (chunk) => process.stdout.write(chunk))
  server.stderr.on('data', (chunk) => process.stderr.write(chunk))
  return server
}

async function waitForServer(url) {
  const deadline = Date.now() + 15000
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url)
      if (response.ok) {
        return
      }
    } catch (_error) {
      // Connection refused while Vite boots — fall through to delay.
    }
    await delay(250)
  }
  throw new Error(`Vite server did not become ready: ${url}`)
}

async function assertRevealFlow(browser, viewport) {
  const page = await browser.newPage({ viewport })
  try {
    await page.goto(baseUrl, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="below"]', { state: 'attached' })
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForFunction(() => window.scrollY === 0)
    await expectBelowFoldHidden(page)
    await revealBelowFold(page)

    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForFunction(() => window.scrollY === 0)
    await page.reload({ waitUntil: 'networkidle' })
    await page.waitForSelector('[data-testid="below"]', { state: 'attached' })
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.waitForFunction(() => window.scrollY === 0)
    await expectBelowFoldHidden(page)
    await revealBelowFold(page)
  } finally {
    await page.close()
  }
}

async function expectBelowFoldHidden(page) {
  const state = await page.evaluate(() => {
    const element = document.querySelector('[data-testid="below"]')
    if (!element) {
      throw new Error('Missing below-fold reveal element')
    }
    const style = window.getComputedStyle(element)
    const rect = element.getBoundingClientRect()
    return {
      hasVisibleClass: element.classList.contains('is-visible'),
      opacity: style.opacity,
      scrollY: window.scrollY,
      top: rect.top,
      viewportHeight: window.innerHeight,
    }
  })

  if (state.hasVisibleClass || state.opacity !== '0' || state.top <= state.viewportHeight) {
    throw new Error(`Below-fold reveal started visible: ${JSON.stringify(state)}`)
  }
}

async function revealBelowFold(page) {
  await page.evaluate(() => {
    const element = document.querySelector('[data-testid="below"]')
    if (!element) {
      throw new Error('Missing below-fold reveal element')
    }
    element.scrollIntoView({ block: 'center' })
  })
  await page.waitForFunction(() => {
    const element = document.querySelector('[data-testid="below"]')
    return element?.classList.contains('is-visible')
  })
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
