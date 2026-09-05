import type { BinauralPreset } from './binauralSynth'

export const SAMPLE_RATE = 44100
export const FRAME_BYTES = 4
export type StudioAudioOptions = {
  preset: BinauralPreset
  seconds: number
  level: number
  noise: 'pink' | 'brown' | 'white' | null
  noiseLevel: number
}
const tau = 2 * Math.PI
const sin = (hz: number, t: number) => Math.sin(tau * hz * t)

// Integral of beat frequency: ramps remain phase-continuous, including when seeking.
export function beatCycles(preset: BinauralPreset, t: number): number {
  if (!preset.ramp) return preset.beatHz * t
  const { fromHz, toHz, seconds } = preset.ramp
  const rampTime = Math.min(t, seconds)
  return fromHz * rampTime + (toHz - fromHz) * rampTime * rampTime / (2 * seconds)
    + toHz * Math.max(0, t - seconds)
}

function hash(n: number): number {
  let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b)
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35)
  return ((x ^ (x >>> 16)) >>> 0) / 2147483648 - 1
}

// Deterministic colored noise supports byte-range seeking without filter resets.
function noiseAt(frame: number, type: StudioAudioOptions['noise']): number {
  if (!type) return 0
  if (type === 'white') return hash(frame)
  let sum = 0
  let weight = 0
  for (let octave = 0; octave < 12; octave++) {
    const size = 1 << octave
    const cell = Math.floor(frame / size)
    const f = (frame % size) / size
    const smooth = f * f * (3 - 2 * f)
    const scale = type === 'brown' ? Math.sqrt(size) : 1
    sum += (hash(cell + octave * 1000003) * (1 - smooth) + hash(cell + 1 + octave * 1000003) * smooth) * scale
    weight += scale
  }
  return sum / weight
}

export function stereoSample(frame: number, options: StudioAudioOptions): [number, number] {
  const { preset: p, level, seconds } = options
  const t = frame / SAMPLE_RATE
  // Half-cosine attack/release avoids clicks and keeps the entire session uninterrupted.
  const edge = Math.max(0, Math.min(1, t / 0.25, (seconds - 1 / SAMPLE_RATE - t) / 0.25))
  const fade = (1 - Math.cos(Math.PI * edge)) / 2
  let envelope = 1
  if (p.hrvHz) envelope *= 1 + 0.16 * sin(p.hrvHz, t)
  const amHz = p.outAmHz || p.gammaAmHz
  if (amHz) envelope *= 1 + Math.min(0.8, (p.outAmDepth ?? 0.015) / 0.18) * sin(amHz, t)
  // Smooth gating rather than square-wave discontinuities.
  if (p.isochronicHz) envelope *= 1 - Math.min(0.9, (p.isochronicDepth ?? 0.02) / 0.18) * (1 - sin(p.isochronicHz, t)) / 2
  const hemi = p.hemiSwapSeconds ? 0.18 * sin(1 / (p.hemiSwapSeconds * 2), t) : 0
  const delay = p.microItdMs ? p.microItdMs / 1000 * (1 + sin(0.01, t)) / 2 : 0
  const rt = Math.max(0, t - delay)
  let left = Math.sin(tau * (p.baseHz * t - beatCycles(p, t) / 2)) * (0.75 + hemi)
  let right = Math.sin(tau * (p.baseHz * rt + beatCycles(p, rt) / 2)) * (0.75 - hemi)
  if (p.secondaryBeatHz) {
    left += 0.35 * sin(p.baseHz - p.secondaryBeatHz / 2, t)
    right += 0.35 * sin(p.baseHz + p.secondaryBeatHz / 2, t)
  }
  const noiseAm = p.noiseAmHz ? 1 + (p.noiseAmDepth ?? 0.06) * sin(p.noiseAmHz, t) : 1
  const noise = noiseAt(frame, options.noise) * options.noiseLevel * 0.3 * noiseAm
  // Keep 3 dB of extra headroom. Noise is centered; carrier channels remain isolated.
  return [(left * level * envelope + noise) * fade * 0.7, (right * level * envelope + noise) * fade * 0.7]
}

export function wavHeader(seconds: number): Uint8Array {
  const bytes = new Uint8Array(44)
  const view = new DataView(bytes.buffer)
  const text = (offset: number, value: string) => value.split('').forEach((c, i) => view.setUint8(offset + i, c.charCodeAt(0)))
  text(0, 'RIFF'); view.setUint32(4, 36 + seconds * SAMPLE_RATE * FRAME_BYTES, true)
  text(8, 'WAVE'); text(12, 'fmt '); view.setUint32(16, 16, true)
  view.setUint16(20, 1, true); view.setUint16(22, 2, true)
  view.setUint32(24, SAMPLE_RATE, true); view.setUint32(28, SAMPLE_RATE * FRAME_BYTES, true)
  view.setUint16(32, FRAME_BYTES, true); view.setUint16(34, 16, true)
  text(36, 'data'); view.setUint32(40, seconds * SAMPLE_RATE * FRAME_BYTES, true)
  return bytes
}

// Byte-identical output for arbitrary ranges, including unaligned Safari probes.
export function renderWavRange(options: StudioAudioOptions, start: number, end: number): Uint8Array {
  const output = new Uint8Array(end - start + 1)
  const header = wavHeader(options.seconds)
  for (let pos = start; pos < Math.min(44, end + 1); pos++) output[pos - start] = header[pos]
  const firstFrame = Math.max(0, Math.floor((start - 44) / FRAME_BYTES))
  const lastFrame = Math.floor((end - 44) / FRAME_BYTES)
  for (let frame = firstFrame; frame <= lastFrame; frame++) {
    const samples = stereoSample(frame, options)
    for (let channel = 0; channel < 2; channel++) {
      // TPDF dither avoids correlated low-level PCM quantization distortion.
      const dither = samples[channel] === 0 ? 0 : (hash(frame * 4 + channel) - hash(frame * 4 + channel + 9817)) / 2
      const pcm = Math.max(-32768, Math.min(32767, Math.round(samples[channel] * 32767 + dither)))
      for (let byte = 0; byte < 2; byte++) {
        const pos = 44 + frame * 4 + channel * 2 + byte
        if (pos >= start && pos <= end) output[pos - start] = (pcm >> (8 * byte)) & 255
      }
    }
  }
  return output
}
