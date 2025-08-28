#!/usr/bin/env tsx

import { execFile } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'

const execFileAsync = promisify(execFile)

interface Track {
  id: string
  title: string
  filenameWebm: string
  filenameAac: string
  durationSec: number
  targetState: 'Focus' | 'Deep Sleep' | 'Lucid' | 'Calm' | 'Recovery' | 'Custom'
  baseFreqHz?: number
  beatHz?: number
  tags: string[]
  gainDb?: number
  description?: string
}

const TRACKS_DIR = path.join('public', 'tracks')

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function ffprobeDurationSeconds(filePath: string): Promise<number> {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v', 'error',
    '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1',
    filePath,
  ])
  const val = parseFloat(stdout.trim())
  return Math.round(isFinite(val) ? val : 0)
}

async function ensureTranscodes(inputPath: string, outputBase: string) {
  const webmPath = path.join(TRACKS_DIR, `${outputBase}.webm`)
  const m4aPath = path.join(TRACKS_DIR, `${outputBase}.m4a`)

  try { await fs.access(webmPath) } catch {
    await execFileAsync('ffmpeg', ['-y', '-i', inputPath, '-c:a', 'libopus', '-b:a', '128k', '-af', 'loudnorm=I=-16:LRA=11:TP=-1.5', webmPath])
  }
  try { await fs.access(m4aPath) } catch {
    await execFileAsync('ffmpeg', ['-y', '-i', inputPath, '-c:a', 'aac', '-b:a', '192k', '-af', 'loudnorm=I=-16:LRA=11:TP=-1.5', m4aPath])
  }
}

function parseBaseFreq(name: string): number | undefined {
  const match = name.match(/(\d{2,3,4})/) // first number like 512, 256, 128, 64, 32
  return match ? parseInt(match[1], 10) : undefined
}

async function main() {
  const entries = await fs.readdir(TRACKS_DIR)
  const inputFiles = entries.filter(f => f.toLowerCase().endsWith('.mp3'))

  if (inputFiles.length === 0) {
    console.log('No .mp3 files found in public/tracks')
    return
  }

  const description = 'MBT binaural beats: primarily 4Hz with brief 8Hz spikes and 2Hz dips; ~50 minutes; optimized 32–512Hz base tones.'

  const tracks: Track[] = []

  for (const file of inputFiles) {
    const base = path.basename(file, path.extname(file))
    const inputPath = path.join(TRACKS_DIR, file)

    // Build a stable output base (keep spaces as-is for URLs; Next will encode)
    const outputBase = base

    // Skip pure pink noise if desired? We'll include it as a separate track
    const isPinkOnly = /pink\s*noise\s*only/i.test(base)
    const isSleep = /^sleep$/i.test(base)

    await ensureTranscodes(inputPath, outputBase)
    const durationSec = await ffprobeDurationSeconds(inputPath)

    const hasPink = /\bP\b|pink/i.test(base)
    const baseFreqHz = parseBaseFreq(base)

    // Title cleanup
    const title = base.replace(/\s+/g, ' ').trim()

    const track: Track = {
      id: slugify(base),
      title,
      filenameWebm: `${outputBase}.webm`,
      filenameAac: `${outputBase}.m4a`,
      durationSec: durationSec || 3000,
      targetState: isSleep ? 'Deep Sleep' : 'Lucid',
      baseFreqHz,
      beatHz: isSleep ? 2 : 4,
      tags: [
        'MBT',
        'Tom Campbell',
        'binaural beats',
        'theta',
        ...(hasPink ? ['pink noise'] : []),
        ...(isPinkOnly ? ['noise only'] : []),
      ],
      gainDb: 0,
      description,
    }

    tracks.push(track)
  }

  const manifest = {
    tracks,
    lastUpdated: new Date().toISOString(),
    totalTracks: tracks.length,
  }

  await fs.writeFile(path.join(TRACKS_DIR, 'tracks.json'), JSON.stringify(manifest, null, 2), 'utf8')
  console.log(`Generated manifest with ${tracks.length} tracks at public/tracks/tracks.json`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})


