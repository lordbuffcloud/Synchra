import { test, expect } from '@playwright/test'
import { renderWavRange, SAMPLE_RATE } from '../../utils/studioPcm'

test.use({ serviceWorkers: 'block' })

test('Studio stream plays, seeks, changes presets, and stops', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/studio')
  await page.getByRole('button', { name: 'Play session', exact: true }).click()
  await expect.poll(() => page.locator('audio').evaluate((audio: HTMLAudioElement) => audio.currentTime)).toBeGreaterThan(0)
  const beforeBackground = await page.locator('audio').evaluate((audio: HTMLAudioElement) => audio.currentTime)
  const otherTab = await page.context().newPage()
  await otherTab.goto('about:blank')
  await otherTab.bringToFront()
  await expect.poll(() => page.locator('audio').evaluate((audio: HTMLAudioElement) => audio.currentTime)).toBeGreaterThan(beforeBackground + 0.5)
  await otherTab.close()
  await page.bringToFront()
  await page.locator('audio').evaluate((audio: HTMLAudioElement) => { audio.currentTime = 120 })
  await expect.poll(() => page.locator('audio').evaluate((audio: HTMLAudioElement) => audio.currentTime)).toBeGreaterThan(120)
  await page.getByRole('button', { name: /Peak Alpha 10 Hz 10Hz/ }).click()
  await expect.poll(() => page.locator('audio').evaluate((audio: HTMLAudioElement) => audio.currentTime)).toBeGreaterThan(0)
  await expect(page.locator('audio')).toHaveAttribute('src', /alpha/)
  await page.getByRole('button', { name: 'Pause session', exact: true }).click()
  await expect.poll(() => page.locator('audio').evaluate((audio: HTMLAudioElement) => audio.paused)).toBe(true)
  await page.getByRole('button', { name: 'Play session', exact: true }).click()
  await page.getByRole('button', { name: 'Stop', exact: true }).click()
  await expect.poll(() => page.locator('audio').evaluate((audio: HTMLAudioElement) => audio.currentTime)).toBe(0)
  expect(errors).toEqual([])
})

test('library uses native playback, then supports switching to effects and back', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.addInitScript(() => {
    const original = AudioContext.prototype.createMediaElementSource
    ;(window as any).sourceConnections = 0
    AudioContext.prototype.createMediaElementSource = function (...args) {
      ;(window as any).sourceConnections++
      return original.apply(this, args)
    }
  })
  const seconds = 10
  const audio = renderWavRange({
    preset: { id: 'test', name: 'Test', description: '', category: 'alpha', baseHz: 400, beatHz: 10 },
    seconds, level: 0.1, noise: null, noiseLevel: 0,
  }, 0, 44 + SAMPLE_RATE * seconds * 4 - 1)
  await page.route(/\/tracks\/.*\.(webm|m4a)/, route => route.fulfill({
    status: 200, contentType: 'audio/wav', body: Buffer.from(audio), headers: { 'Access-Control-Allow-Origin': '*' },
  }))
  await page.goto('/player/nv01-rv-primer-12to7p83')
  await page.getByRole('button', { name: 'Play track', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Pause track', exact: true })).toBeVisible()
  await expect.poll(() => page.locator('audio[data-player-slot="A"]').evaluate((audio: HTMLAudioElement) => audio.currentTime)).toBeGreaterThan(0)
  expect(await page.evaluate(() => (window as any).sourceConnections)).toBe(0)
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('checkbox', { name: 'Background playback', exact: true }).uncheck()
  await expect.poll(() => page.evaluate(() => (window as any).sourceConnections)).toBe(2)
  await expect(page.getByRole('button', { name: 'Pause track', exact: true })).toBeVisible()
  await page.getByRole('checkbox', { name: 'Background playback', exact: true }).check()
  await expect(page.getByRole('button', { name: 'Pause track', exact: true })).toBeVisible()
  expect(await page.evaluate(() => (window as any).sourceConnections)).toBe(2)
  await page.getByRole('button', { name: 'Pause track', exact: true }).click()
  await expect.poll(() => page.locator('audio').evaluateAll(audios => audios.every(audio => (audio as HTMLAudioElement).paused))).toBe(true)
  expect(errors).toEqual([])
})

test('live synthesis remains silent at zero level even with modulation', async ({ page }) => {
  const { readFileSync } = await import('node:fs')
  const ts = await import('typescript')
  const source = readFileSync('utils/binauralSynth.ts', 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText
  await page.goto('/studio')
  await page.addScriptTag({ content: `(() => { const exports = {}; ${compiled}; window.TestSynth = exports.BinauralBeatSynth; })()` })
  const peak = await page.evaluate(async () => {
    const ctx = new OfflineAudioContext(2, 44100, 44100)
    const synth = new (window as any).TestSynth(ctx, ctx.destination)
    synth.start({ baseHz: 400, beatHz: 6, hrvHz: 0.1, outAmHz: 40, isochronicHz: 40 }, 0)
    const buffer = await ctx.startRendering()
    let peak = 0
    for (let channel = 0; channel < 2; channel++) {
      const samples = buffer.getChannelData(channel)
      for (let i = 0; i < samples.length; i++) peak = Math.max(peak, Math.abs(samples[i]))
    }
    return peak
  })
  expect(peak).toBe(0)
})
