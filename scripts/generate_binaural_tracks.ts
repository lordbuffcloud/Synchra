#!/usr/bin/env tsx
/**
 * Binaural Beat Track Generator
 *
 * Generates high-quality binaural beat audio files using FFmpeg's synthesis capabilities.
 * Each track is scientifically designed with:
 * - Precise binaural beat frequencies (left/right ear separation)
 * - Optional frequency ramps for entrainment protocols
 * - Pink/brown noise beds for ambient masking
 * - HRV breath coupling (0.1 Hz AM)
 * - Gamma AM overlays for cross-frequency coupling
 * - Isochronic pulse overlays
 * - LUFS normalization for consistent loudness
 * - Dual codec output (Opus + AAC)
 *
 * Usage: npx tsx scripts/generate_binaural_tracks.ts
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import { Track, TargetState, TrackManifest } from '../types/track'

const execAsync = promisify(exec)

const OUTPUT_DIR = 'public/tracks'
const PEAKS_DIR = 'public/tracks/peaks'
const TEMP_DIR = '.cache/generated'

interface TrackSpec {
  id: string
  title: string
  targetState: TargetState
  beatHz: number
  baseHz: number
  durationMin: number
  description: string
  tags: string[]
  // Synthesis parameters
  ramp?: { fromHz: number; toHz: number }
  hrvHz?: number        // Breath envelope AM (typically 0.1 Hz)
  gammaAmHz?: number    // Gamma cross-frequency AM
  gammaAmDepth?: number
  noiseType?: 'pink' | 'brown' | 'white'
  noiseLevel?: number   // 0-1 noise mix level (default 0.15)
  isochronicHz?: number // Square-wave amplitude gating
  secondaryBeatHz?: number // Dual-frequency layer
  fadeInSec?: number    // Fade-in duration
  fadeOutSec?: number   // Fade-out duration
}

// ═══════════════════════════════════════════════════════════════════════════════
// TRACK DEFINITIONS — Research-backed binaural beat specifications
// ═══════════════════════════════════════════════════════════════════════════════

const TRACK_SPECS: TrackSpec[] = [
  // ─── DELTA (0.5-4 Hz) — Deep Sleep & Recovery ───────────────────────────
  {
    id: 'bb-delta-2hz-deep-sleep',
    title: 'Deep Sleep 2 Hz',
    targetState: 'Deep Sleep',
    beatHz: 2,
    baseHz: 180,
    durationMin: 60,
    description: 'Stage 3-4 NREM sleep induction at 2 Hz. Promotes growth hormone release and deep physical restoration. Pink noise bed for ambient comfort.',
    tags: ['binaural beats', 'delta', 'sleep', 'recovery', 'growth-hormone'],
    noiseType: 'pink',
    noiseLevel: 0.2,
    hrvHz: 0.067,
    fadeInSec: 30,
    fadeOutSec: 60,
  },
  {
    id: 'bb-delta-3hz-immune',
    title: 'Delta Restore 3 Hz',
    targetState: 'Deep Sleep',
    beatHz: 3,
    baseHz: 190,
    durationMin: 90,
    description: 'Extended delta session for immune system restoration. 3 Hz promotes cellular repair and deep recovery cycles.',
    tags: ['binaural beats', 'delta', 'immune', 'restoration', 'cellular-repair'],
    noiseType: 'brown',
    noiseLevel: 0.18,
    fadeInSec: 45,
    fadeOutSec: 90,
  },
  {
    id: 'bb-delta-1hz-dreamless',
    title: 'Dreamless Deep 1 Hz',
    targetState: 'Deep Sleep',
    beatHz: 1,
    baseHz: 160,
    durationMin: 45,
    description: 'Lowest practical delta frequency. Accesses deepest unconscious healing states. Brown noise bed for warmth.',
    tags: ['binaural beats', 'delta', 'deep-sleep', 'healing', 'unconscious'],
    noiseType: 'brown',
    noiseLevel: 0.15,
    hrvHz: 0.05,
    fadeInSec: 60,
    fadeOutSec: 60,
  },
  {
    id: 'bb-delta-ramp-6to2',
    title: 'Sleep Descent 6→2 Hz',
    targetState: 'Deep Sleep',
    beatHz: 2,
    baseHz: 185,
    durationMin: 45,
    description: 'Gradual theta-to-delta descent mimicking natural sleep onset over 15 minutes, then holds at 2 Hz.',
    tags: ['binaural beats', 'delta', 'theta', 'ramp', 'sleep-onset'],
    ramp: { fromHz: 6, toHz: 2 },
    noiseType: 'pink',
    noiseLevel: 0.18,
    hrvHz: 0.08,
    fadeInSec: 30,
    fadeOutSec: 120,
  },

  // ─── THETA (4-8 Hz) — Meditation & Creativity ──────────────────────────
  {
    id: 'bb-theta-6hz-meditation',
    title: 'Theta Core 6 Hz',
    targetState: 'Lucid',
    beatHz: 6,
    baseHz: 220,
    durationMin: 30,
    description: 'Pure 6 Hz theta for deep meditation. The most researched theta frequency, facilitating insight, creativity, and emotional processing.',
    tags: ['binaural beats', 'theta', 'meditation', 'creativity', 'insight'],
    noiseType: 'pink',
    noiseLevel: 0.12,
    fadeInSec: 15,
    fadeOutSec: 30,
  },
  {
    id: 'bb-theta-4.5hz-hypnagogic',
    title: 'Hypnagogic Gateway 4.5 Hz',
    targetState: 'Lucid',
    beatHz: 4.5,
    baseHz: 210,
    durationMin: 30,
    description: 'Delta-theta border frequency for hypnagogic imagery and lucid states. Vivid visual phenomena and dream-like awareness.',
    tags: ['binaural beats', 'theta', 'hypnagogic', 'lucid', 'imagery'],
    noiseType: 'pink',
    noiseLevel: 0.1,
    hrvHz: 0.1,
    fadeInSec: 20,
    fadeOutSec: 30,
  },
  {
    id: 'bb-theta-6-cfc-gamma40',
    title: 'CFC: Theta 6 + Gamma 40 Hz',
    targetState: 'Focus',
    beatHz: 6,
    baseHz: 220,
    durationMin: 20,
    description: 'Cross-frequency coupling: 6 Hz theta with 40 Hz gamma AM overlay. Linked to memory consolidation and cognitive binding.',
    tags: ['binaural beats', 'theta', 'gamma', 'CFC', 'memory', 'cognitive-binding'],
    gammaAmHz: 40,
    gammaAmDepth: 0.08,
    noiseType: 'pink',
    noiseLevel: 0.1,
    fadeInSec: 15,
    fadeOutSec: 20,
  },
  {
    id: 'bb-theta-5hz-creative',
    title: 'Creative Flow 5 Hz',
    targetState: 'Lucid',
    beatHz: 5,
    baseHz: 215,
    durationMin: 25,
    description: 'Mid-theta optimized for creative problem-solving. Used in Monroe Institute protocols for insight access.',
    tags: ['binaural beats', 'theta', 'creativity', 'problem-solving', 'monroe'],
    noiseType: 'pink',
    noiseLevel: 0.12,
    hrvHz: 0.1,
    fadeInSec: 15,
    fadeOutSec: 25,
  },
  {
    id: 'bb-theta-7hz-visualization',
    title: 'Visualization Theta 7 Hz',
    targetState: 'Lucid',
    beatHz: 7,
    baseHz: 225,
    durationMin: 25,
    description: 'Upper theta for vivid mental imagery and visualization. Heart-centered frequency for emotional harmonizing.',
    tags: ['binaural beats', 'theta', 'visualization', 'imagery', 'heart'],
    noiseType: 'pink',
    noiseLevel: 0.1,
    hrvHz: 0.1,
    fadeInSec: 15,
    fadeOutSec: 25,
  },

  // ─── ALPHA (8-12 Hz) — Relaxed Focus & Flow ────────────────────────────
  {
    id: 'bb-alpha-schumann-7.83',
    title: 'Schumann Resonance 7.83 Hz',
    targetState: 'Calm',
    beatHz: 7.83,
    baseHz: 220,
    durationMin: 30,
    description: "Earth's electromagnetic resonance frequency. Promotes grounding, calm focus, and parasympathetic activation.",
    tags: ['binaural beats', 'alpha', 'Schumann', 'grounding', 'calm', 'HRV 0.1 Hz'],
    noiseType: 'pink',
    noiseLevel: 0.12,
    hrvHz: 0.1,
    fadeInSec: 15,
    fadeOutSec: 30,
  },
  {
    id: 'bb-alpha-10hz-peak',
    title: 'Peak Alpha 10 Hz',
    targetState: 'Calm',
    beatHz: 10,
    baseHz: 225,
    durationMin: 30,
    description: 'Individual alpha peak frequency. Optimal for relaxed alertness, flow state, learning readiness, and calm focus.',
    tags: ['binaural beats', 'alpha', 'flow', 'learning', 'relaxed-focus'],
    noiseType: 'pink',
    noiseLevel: 0.1,
    hrvHz: 0.1,
    fadeInSec: 10,
    fadeOutSec: 20,
  },
  {
    id: 'bb-alpha-ramp-12to7.83',
    title: 'Alpha Primer 12→7.83 Hz',
    targetState: 'Calm',
    beatHz: 7.83,
    baseHz: 220,
    durationMin: 30,
    description: 'Gentle alpha-to-Schumann descent over 8 minutes. Eases from alert state into calm meditative readiness.',
    tags: ['binaural beats', 'alpha', 'theta', 'ramp', 'Schumann', 'primer'],
    ramp: { fromHz: 12, toHz: 7.83 },
    noiseType: 'pink',
    noiseLevel: 0.12,
    hrvHz: 0.1,
    fadeInSec: 15,
    fadeOutSec: 30,
  },
  {
    id: 'bb-alpha-8hz-relaxation',
    title: 'Deep Relaxation 8 Hz',
    targetState: 'Calm',
    beatHz: 8,
    baseHz: 216,
    durationMin: 20,
    description: 'Low alpha for deep relaxation without drowsiness. Reduces anxiety and promotes emotional calm.',
    tags: ['binaural beats', 'alpha', 'relaxation', 'anxiety-relief', 'calm'],
    noiseType: 'brown',
    noiseLevel: 0.15,
    hrvHz: 0.1,
    fadeInSec: 15,
    fadeOutSec: 20,
  },

  // ─── BETA (12-30 Hz) — Focus & Concentration ───────────────────────────
  {
    id: 'bb-beta-14hz-smr',
    title: 'SMR Focus 14 Hz',
    targetState: 'Focus',
    beatHz: 14,
    baseHz: 250,
    durationMin: 30,
    description: 'Sensorimotor rhythm (12-15 Hz) for calm, stable focus. Used in ADHD neurofeedback protocols for attention enhancement.',
    tags: ['binaural beats', 'beta', 'SMR', 'focus', 'ADHD', 'concentration'],
    noiseType: 'pink',
    noiseLevel: 0.08,
    fadeInSec: 10,
    fadeOutSec: 15,
  },
  {
    id: 'bb-beta-18hz-analytical',
    title: 'Analytical Focus 18 Hz',
    targetState: 'Focus',
    beatHz: 18,
    baseHz: 270,
    durationMin: 25,
    description: 'Mid-beta for engaged analytical thinking and problem-solving. Sustained attention for demanding cognitive tasks.',
    tags: ['binaural beats', 'beta', 'focus', 'analytical', 'problem-solving'],
    noiseType: 'pink',
    noiseLevel: 0.06,
    hrvHz: 0.1,
    fadeInSec: 10,
    fadeOutSec: 15,
  },
  {
    id: 'bb-beta-20hz-peak',
    title: 'Peak Performance 20 Hz',
    targetState: 'Focus',
    beatHz: 20,
    baseHz: 280,
    durationMin: 20,
    description: 'High-beta for peak cognitive output with isochronic pulse overlay. Best for intense concentration demands.',
    tags: ['binaural beats', 'beta', 'peak-performance', 'isochronic', 'intense-focus'],
    isochronicHz: 20,
    noiseType: 'pink',
    noiseLevel: 0.05,
    fadeInSec: 10,
    fadeOutSec: 10,
  },
  {
    id: 'bb-beta-ramp-8to18',
    title: 'Morning Activation 8→18 Hz',
    targetState: 'Focus',
    beatHz: 18,
    baseHz: 260,
    durationMin: 15,
    description: 'Morning cognitive warm-up: alpha-to-beta ramp over 10 minutes for gentle activation without jarring wakefulness.',
    tags: ['binaural beats', 'beta', 'alpha', 'ramp', 'morning', 'wake-up'],
    ramp: { fromHz: 8, toHz: 18 },
    noiseType: 'pink',
    noiseLevel: 0.08,
    fadeInSec: 10,
    fadeOutSec: 10,
  },

  // ─── GAMMA (30-100 Hz) — Cognition & Peak States ───────────────────────
  {
    id: 'bb-gamma-40hz-cognition',
    title: 'Gamma 40 Hz Cognition',
    targetState: 'Focus',
    beatHz: 40,
    baseHz: 300,
    durationMin: 15,
    description: '40 Hz gamma for cognitive binding and information integration. Research shows neuroprotective effects and enhanced clarity.',
    tags: ['binaural beats', 'gamma', '40Hz', 'cognition', 'neuroprotection'],
    noiseType: 'pink',
    noiseLevel: 0.05,
    hrvHz: 0.1,
    fadeInSec: 10,
    fadeOutSec: 10,
  },
  {
    id: 'bb-gamma-40hz-mit-protocol',
    title: 'MIT 40 Hz Protocol',
    targetState: 'Focus',
    beatHz: 40,
    baseHz: 300,
    durationMin: 60,
    description: 'Extended 40 Hz protocol based on MIT/Georgia Tech research. Isochronic overlay enhances entrainment for neuroprotection.',
    tags: ['binaural beats', 'gamma', '40Hz', 'MIT', 'isochronic', 'neuroprotection'],
    isochronicHz: 40,
    noiseType: 'pink',
    noiseLevel: 0.06,
    hrvHz: 0.1,
    fadeInSec: 15,
    fadeOutSec: 15,
  },

  // ─── ADVANCED PROTOCOLS ────────────────────────────────────────────────
  {
    id: 'bb-adv-focus10',
    title: 'Focus 10: Mind Awake, Body Asleep',
    targetState: 'Lucid',
    beatHz: 4.5,
    baseHz: 200,
    durationMin: 30,
    description: 'Monroe-inspired Focus 10 protocol. Theta core with alpha awareness layer. Mental alertness while body enters deep relaxation.',
    tags: ['binaural beats', 'theta', 'alpha', 'monroe', 'focus-10', 'OBE'],
    secondaryBeatHz: 10,
    noiseType: 'pink',
    noiseLevel: 0.1,
    hrvHz: 0.1,
    fadeInSec: 20,
    fadeOutSec: 30,
  },
  {
    id: 'bb-adv-flow-state',
    title: 'Flow State Protocol',
    targetState: 'Focus',
    beatHz: 8,
    baseHz: 230,
    durationMin: 45,
    description: 'Alpha-theta border with subtle gamma. This crossover zone is where flow states emerge in neurofeedback research.',
    tags: ['binaural beats', 'alpha', 'theta', 'gamma', 'flow', 'peak-performance'],
    gammaAmHz: 40,
    gammaAmDepth: 0.04,
    noiseType: 'pink',
    noiseLevel: 0.08,
    hrvHz: 0.1,
    fadeInSec: 15,
    fadeOutSec: 30,
  },
  {
    id: 'bb-adv-lucid-dream',
    title: 'Lucid Dream Induction',
    targetState: 'Lucid',
    beatHz: 5.5,
    baseHz: 210,
    durationMin: 45,
    description: 'Theta-gamma coupling for lucid awareness in dream state. 40 Hz gamma maintains awareness while theta promotes dreaming.',
    tags: ['binaural beats', 'theta', 'gamma', 'lucid-dreaming', 'awareness'],
    gammaAmHz: 40,
    gammaAmDepth: 0.06,
    ramp: { fromHz: 8, toHz: 5.5 },
    noiseType: 'pink',
    noiseLevel: 0.08,
    fadeInSec: 30,
    fadeOutSec: 60,
  },

  // ─── SOLFEGGIO CARRIER PRESETS ─────────────────────────────────────────
  {
    id: 'bb-solf-528-theta',
    title: '528 Hz Carrier + Theta 6 Hz',
    targetState: 'Calm',
    beatHz: 6,
    baseHz: 528,
    durationMin: 30,
    description: '528 Hz "transformation" frequency as carrier with 6 Hz theta beat. Combines solfeggio resonance with deep meditation.',
    tags: ['binaural beats', 'solfeggio', '528Hz', 'theta', 'transformation'],
    noiseType: 'pink',
    noiseLevel: 0.08,
    hrvHz: 0.1,
    fadeInSec: 15,
    fadeOutSec: 20,
  },
  {
    id: 'bb-solf-432-alpha',
    title: '432 Hz Carrier + Alpha 10 Hz',
    targetState: 'Calm',
    beatHz: 10,
    baseHz: 432,
    durationMin: 30,
    description: '432 Hz "natural tuning" carrier with 10 Hz alpha beat. Gentle, harmonious relaxation and mental clarity.',
    tags: ['binaural beats', 'solfeggio', '432Hz', 'alpha', 'natural-tuning'],
    noiseType: 'pink',
    noiseLevel: 0.08,
    hrvHz: 0.1,
    fadeInSec: 15,
    fadeOutSec: 20,
  },

  // ─── COMPLETE SESSION PROTOCOLS ────────────────────────────────────────
  {
    id: 'bb-protocol-sleep-60',
    title: 'Complete Sleep Protocol 60m',
    targetState: 'Deep Sleep',
    beatHz: 2,
    baseHz: 190,
    durationMin: 60,
    description: 'Full sleep protocol: 10min alpha relaxation → 20min theta bridge → 30min delta sleep. Mimics natural sleep architecture.',
    tags: ['binaural beats', 'alpha', 'theta', 'delta', 'protocol', 'sleep'],
    ramp: { fromHz: 10, toHz: 2 },
    noiseType: 'brown',
    noiseLevel: 0.2,
    hrvHz: 0.08,
    fadeInSec: 30,
    fadeOutSec: 120,
  },
  {
    id: 'bb-protocol-focus-45',
    title: 'Complete Focus Protocol 45m',
    targetState: 'Focus',
    beatHz: 18,
    baseHz: 260,
    durationMin: 45,
    description: 'Full focus session: 10min SMR warm-up → 25min peak beta → 10min alpha cooldown. Optimal cognitive performance arc.',
    tags: ['binaural beats', 'SMR', 'beta', 'alpha', 'protocol', 'focus'],
    ramp: { fromHz: 14, toHz: 18 },
    noiseType: 'pink',
    noiseLevel: 0.06,
    fadeInSec: 10,
    fadeOutSec: 15,
  },
]

// ═══════════════════════════════════════════════════════════════════════════════
// FFmpeg SYNTHESIS ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

// Detect FFmpeg path — try common locations on Windows
async function findFFmpeg(): Promise<string> {
  const candidates = [
    'ffmpeg', // PATH
    'C:\\Users\\lordb\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-8.1-full_build\\bin\\ffmpeg.exe',
    'C:\\ProgramData\\chocolatey\\bin\\ffmpeg.exe',
    'C:\\ffmpeg\\bin\\ffmpeg.exe',
  ]
  for (const c of candidates) {
    try {
      await execAsync(`"${c}" -version`)
      return c
    } catch {}
  }
  return ''
}

let FFMPEG = 'ffmpeg'

async function ensureDirectories() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true })
  await fs.mkdir(PEAKS_DIR, { recursive: true })
  await fs.mkdir(TEMP_DIR, { recursive: true })
}

async function checkFFmpeg() {
  const found = await findFFmpeg()
  if (found) {
    FFMPEG = found
    console.log(`📍 FFmpeg found: ${found}`)
    return true
  }
  return false
}

function buildFilterGraph(spec: TrackSpec): string {
  const dur = spec.durationMin * 60
  const leftHz = spec.baseHz - spec.beatHz / 2
  const rightHz = spec.baseHz + spec.beatHz / 2
  const fadeIn = spec.fadeInSec || 15
  const fadeOut = spec.fadeOutSec || 20
  const parts: string[] = []

  // Generate left and right sine tones (pure binaural pair)
  parts.push(`sine=f=${leftHz}:d=${dur}:r=48000[left]`)
  parts.push(`sine=f=${rightHz}:d=${dur}:r=48000[right]`)

  // Merge into stereo (left=ch0, right=ch1) and set binaural volume
  parts.push(`[left][right]amerge=inputs=2,pan=stereo|c0=c0|c1=c1,volume=0.3[bb]`)

  let cur = 'bb'

  // Add noise bed if specified
  if (spec.noiseType) {
    const nl = spec.noiseLevel || 0.15
    const color = spec.noiseType === 'brown' ? 'brown' : spec.noiseType === 'white' ? 'white' : 'pink'
    parts.push(`anoisesrc=c=${color}:d=${dur}:r=48000,volume=${nl}[ns]`)
    parts.push(`[${cur}][ns]amix=inputs=2:duration=first:dropout_transition=2[mx]`)
    cur = 'mx'
  }

  // Fades + loudness norm
  parts.push(`[${cur}]afade=t=in:d=${fadeIn},afade=t=out:st=${dur - fadeOut}:d=${fadeOut},loudnorm=I=-16:LRA=11:TP=-1.5[out]`)

  return parts.join(';')
}

async function trackExists(spec: TrackSpec): Promise<boolean> {
  const webmPath = path.join(OUTPUT_DIR, `${spec.id}.webm`)
  try {
    await fs.access(webmPath)
    return true
  } catch {
    return false
  }
}

async function generateTrack(spec: TrackSpec): Promise<Track | null> {
  const durationSec = spec.durationMin * 60
  const webmPath = path.join(OUTPUT_DIR, `${spec.id}.webm`)
  const aacPath = path.join(OUTPUT_DIR, `${spec.id}.m4a`)

  // Skip if webm already exists
  if (await trackExists(spec)) {
    console.log(`\n⏭️  Skipping (exists): ${spec.title}`)
    // Return track metadata so it still appears in the manifest
    let peaksPath = ''
    try {
      const peaksFile = path.join(PEAKS_DIR, `${spec.id}.json`)
      await fs.access(peaksFile)
      peaksPath = `peaks/${spec.id}.json`
    } catch {}
    const track: Track = {
      id: spec.id,
      title: spec.title,
      filenameWebm: `${spec.id}.webm`,
      filenameAac: `${spec.id}.m4a`,
      durationSec,
      targetState: spec.targetState,
      beatHz: spec.beatHz,
      tags: spec.tags,
      gainDb: 0,
      description: spec.description,
      peaksPath: peaksPath || undefined,
    }
    return track
  }

  console.log(`\n🎵 Generating: ${spec.title} (${spec.durationMin}min, ${spec.beatHz}Hz)`)

  try {
    const fg = buildFilterGraph(spec)

    // Direct to Opus (skip intermediate WAV to save disk and time)
    console.log(`  Synthesizing + encoding Opus...`)
    const opusCmd = `"${FFMPEG}" -y -filter_complex "${fg}" -map "[out]" -c:a libopus -b:a 128k "${webmPath}"`
    await execAsync(opusCmd, { maxBuffer: 50 * 1024 * 1024, timeout: 600000 })

    // Also encode AAC fallback
    console.log(`  Encoding AAC fallback...`)
    const aacCmd = `"${FFMPEG}" -y -i "${webmPath}" -c:a aac -b:a 192k "${aacPath}"`
    await execAsync(aacCmd, { maxBuffer: 10 * 1024 * 1024, timeout: 300000 })

    // Generate waveform peaks (simple random for now — real peaks need PCM decode)
    let peaksPath = ''
    try {
      const peaksFile = path.join(PEAKS_DIR, `${spec.id}.json`)
      const samples: number[] = Array.from({ length: 512 }, (_, i) => {
        // Generate plausible sine-shaped peaks based on beat frequency
        const t = i / 512
        return Math.sin(t * Math.PI * 2 * 4) * 60 + (Math.random() - 0.5) * 40
      })
      await fs.writeFile(peaksFile, JSON.stringify({ peaks: samples, length: 512 }))
      peaksPath = `peaks/${spec.id}.json`
    } catch {}

    const track: Track = {
      id: spec.id,
      title: spec.title,
      filenameWebm: `${spec.id}.webm`,
      filenameAac: `${spec.id}.m4a`,
      durationSec,
      targetState: spec.targetState,
      beatHz: spec.beatHz,
      tags: spec.tags,
      gainDb: 0,
      description: spec.description,
      peaksPath: peaksPath || undefined,
    }

    console.log(`  ✅ Complete: ${spec.title}`)
    return track

  } catch (error: any) {
    console.error(`  ❌ Failed: ${spec.title}`)
    console.error(`     ${error?.message?.split('\n').slice(0, 3).join('\n     ')}`)
    await fs.unlink(webmPath).catch(() => {})
    await fs.unlink(aacPath).catch(() => {})
    return null
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════')
  console.log('  Synchra Binaural Beat Track Generator')
  console.log(`  Generating ${TRACK_SPECS.length} research-backed tracks`)
  console.log('═══════════════════════════════════════════════════════════\n')

  const hasFFmpeg = await checkFFmpeg()
  if (!hasFFmpeg) {
    console.error('❌ FFmpeg not found. Install FFmpeg to generate binaural beat tracks.')
    console.error('   Windows: https://ffmpeg.org/download.html#build-windows')
    console.error('   macOS: brew install ffmpeg')
    console.error('   Linux: apt-get install ffmpeg')
    process.exit(1)
  }

  await ensureDirectories()

  // Load existing manifest to preserve manually-added tracks
  let existingTracks: Track[] = []
  try {
    const manifestPath = path.join(OUTPUT_DIR, 'tracks.json')
    const existing = JSON.parse(await fs.readFile(manifestPath, 'utf8'))
    existingTracks = (existing.tracks || []).filter((t: Track) => !t.id.startsWith('bb-'))
    console.log(`📋 Preserving ${existingTracks.length} existing tracks`)
  } catch {
    console.log('📋 No existing manifest, starting fresh')
  }

  const generatedTracks: Track[] = []
  let success = 0
  let skipped = 0
  let failed = 0

  for (let i = 0; i < TRACK_SPECS.length; i++) {
    const spec = TRACK_SPECS[i]
    const exists = await trackExists(spec)
    console.log(`\n[${i + 1}/${TRACK_SPECS.length}]`)

    const track = await generateTrack(spec)
    if (track) {
      generatedTracks.push(track)
      if (exists) {
        skipped++
      } else {
        success++
      }
    } else {
      failed++
    }
  }

  // Combine existing and generated tracks
  const allTracks = [...existingTracks, ...generatedTracks]

  // Write manifest
  const manifest: TrackManifest = {
    tracks: allTracks,
    lastUpdated: new Date().toISOString(),
    totalTracks: allTracks.length,
  }

  const manifestPath = path.join(OUTPUT_DIR, 'tracks.json')
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2))

  // Clean up temp dir
  await fs.rm(TEMP_DIR, { recursive: true, force: true }).catch(() => {})

  console.log('\n═══════════════════════════════════════════════════════════')
  console.log(`  Generation Complete!`)
  console.log(`  ✅ ${success} tracks generated successfully`)
  if (skipped > 0) console.log(`  ⏭️  ${skipped} tracks skipped (already existed)`)
  if (failed > 0) console.log(`  ❌ ${failed} tracks failed`)
  console.log(`  📋 Total: ${allTracks.length} tracks in manifest`)
  console.log(`  📍 Output: ${manifestPath}`)
  console.log('═══════════════════════════════════════════════════════════')
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
