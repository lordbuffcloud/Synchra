import test from 'node:test'
import assert from 'node:assert/strict'
import { PRESETS } from '../content/studioPresets'
import { beatCycles, renderWavRange, SAMPLE_RATE, stereoSample, StudioAudioOptions } from '../utils/studioPcm'
import { GET, HEAD } from '../app/api/studio-audio/route'

const preset = { id: 'test', name: 'test', description: '', category: 'alpha' as const, baseHz: 400, beatHz: 10 }
const options: StudioAudioOptions = { preset, seconds: 10, level: 0.18, noise: null, noiseLevel: 0 }
const url = `http://localhost/api/studio-audio?preset=${PRESETS[0].id}&seconds=2`

test('phase integration keeps ramps continuous and reaches the target beat', () => {
  const ramp = { ...preset, ramp: { fromHz: 12, toHz: 4, seconds: 60 } }
  assert.equal(beatCycles(ramp, 60), 480)
  assert.equal(beatCycles(ramp, 61), 484)
  const t = 30, dt = 0.00001
  assert.ok(Math.abs((beatCycles(ramp, t + dt) - beatCycles(ramp, t)) / dt - 8) < 0.0001)
})

test('stereo tones have the requested per-ear frequencies and clean session edges', () => {
  for (const frame of [44100, 44113, 60000]) {
    const [left, right] = stereoSample(frame, options)
    const t = frame / SAMPLE_RATE
    assert.ok(Math.abs(left - Math.sin(2 * Math.PI * 395 * t) * 0.75 * 0.18 * 0.7) < 1e-9)
    assert.ok(Math.abs(right - Math.sin(2 * Math.PI * 405 * t) * 0.75 * 0.18 * 0.7) < 1e-9)
  }
  assert.deepEqual(stereoSample(0, options), [0, 0])
  assert.ok(stereoSample(10 * SAMPLE_RATE - 1, options).every(x => Math.abs(x) < 1e-12))
})

test('all presets retain headroom; zero level silences every modulation', () => {
  for (const preset of PRESETS) {
    for (let frame = 0; frame < SAMPLE_RATE * 10; frame += 397) {
      const sample = stereoSample(frame, { ...options, preset, level: 0.35, noise: 'white', noiseLevel: 0.5 })
      assert.ok(sample.every(x => Number.isFinite(x) && Math.abs(x) < 0.95), preset.id)
      assert.ok(stereoSample(frame, { ...options, preset, level: 0 }).every(x => x === 0), preset.id)
    }
  }
})

test('unaligned ranges reassemble byte-identical audio, including deterministic noise', () => {
  const noiseOptions = { ...options, noise: 'pink' as const, noiseLevel: 0.2 }
  const full = renderWavRange(noiseOptions, 0, 9999)
  const parts = [renderWavRange(noiseOptions, 0, 42), renderWavRange(noiseOptions, 43, 5500), renderWavRange(noiseOptions, 5501, 9999)]
  assert.deepEqual(Buffer.concat(parts), Buffer.from(full))
  const view = new DataView(full.buffer)
  assert.equal(view.getUint16(22, true), 2)
  assert.equal(view.getUint32(24, true), 44100)
})

test('endpoint supports HEAD, Safari header probes, suffixes, and invalid ranges', async () => {
  const head = HEAD(new Request(url))
  assert.equal(head.status, 200)
  assert.equal(head.headers.get('content-length'), String(44 + 2 * 44100 * 4))
  assert.equal(await head.text(), '')
  const probe = GET(new Request(url, { headers: { range: 'bytes=0-1' } }))
  assert.equal(probe.status, 206)
  assert.equal(await probe.text(), 'RI')
  const suffix = GET(new Request(url, { headers: { range: 'bytes=-4' } }))
  assert.equal((await suffix.arrayBuffer()).byteLength, 4)
  for (const range of ['bytes=9999999-', 'bytes=10-2', 'bytes=-0', 'bytes=foo-bar']) {
    assert.equal(GET(new Request(url, { headers: { range } })).status, 416)
  }
  assert.equal(GET(new Request(url + '&level=NaN')).status, 400)
  assert.equal(GET(new Request(url.replace('seconds=2', 'seconds=99999'))).status, 400)
})

test('open-ended ranges are bounded while advertising the full session length', async () => {
  const response = GET(new Request(url.replace('seconds=2', 'seconds=60'), { headers: { range: 'bytes=0-' } }))
  assert.equal(response.status, 206)
  assert.equal(response.headers.get('content-length'), '1048576')
  assert.match(response.headers.get('content-range')!, /^bytes 0-1048575\//)
  assert.equal((await response.arrayBuffer()).byteLength, 1048576)
})
