/**
 * Generate all 15 NV binaural beat tracks using FFmpeg
 */
import { execSync } from 'child_process'
import { existsSync, mkdirSync } from 'fs'

const OUT = 'public/tracks'
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true })

const BASE = 220 // carrier Hz

function generate({ id, filename, dur, beatHz, rampFrom, rampTo, noiseType = 'pink' }) {
  const leftHz = BASE - beatHz / 2
  const rightHz = BASE + beatHz / 2

  let toneFilter
  if (rampFrom != null && rampTo != null) {
    const lf = BASE - rampFrom / 2
    const rf = BASE + rampFrom / 2
    const lt = BASE - rampTo / 2
    const rt = BASE + rampTo / 2
    toneFilter = `aevalsrc='0.4*sin(2*PI*(${lf}+(${lt}-${lf})*t/${dur})*t)|0.4*sin(2*PI*(${rf}+(${rt}-${rf})*t/${dur})*t)':s=48000:d=${dur}`
  } else {
    toneFilter = `aevalsrc='0.4*sin(2*PI*${leftHz}*t)|0.4*sin(2*PI*${rightHz}*t)':s=48000:d=${dur}`
  }

  const noiseAmp = noiseType === 'white' ? 0.05 : 0.08
  const noiseFilter = `anoisesrc=color=${noiseType}:d=${dur}:a=${noiseAmp},aformat=channel_layouts=stereo`
  const fadeOut = dur - 10

  const mixFilter = `[0:a][1:a]amix=inputs=2:weights=1 0.5,afade=t=in:d=8,afade=t=out:st=${fadeOut}:d=10,alimiter=limit=0.95`

  console.log(`[${id}] Generating ${dur}s @ ${beatHz}Hz beat...`)

  // WebM/Opus
  execSync(
    `ffmpeg -y -f lavfi -i "${toneFilter}" -f lavfi -i "${noiseFilter}" -filter_complex "${mixFilter}" -c:a libopus -b:a 128k -ar 48000 "${OUT}/${filename}.webm"`,
    { stdio: 'pipe' }
  )

  // M4A/AAC
  execSync(
    `ffmpeg -y -f lavfi -i "${toneFilter}" -f lavfi -i "${noiseFilter}" -filter_complex "${mixFilter}" -c:a aac -b:a 192k -ar 44100 "${OUT}/${filename}.m4a"`,
    { stdio: 'pipe' }
  )

  console.log(`[${id}] Done: ${filename}.webm + ${filename}.m4a`)
}

const tracks = [
  { id: 'NV01', filename: 'NV01_RV_Primer_12to7p83', dur: 2700, beatHz: 7.83, rampFrom: 12, rampTo: 7.83 },
  { id: 'NV02', filename: 'NV02_Schumann_Hold_7p83', dur: 2700, beatHz: 7.83 },
  { id: 'NV03', filename: 'NV03_Gate_8to4', dur: 3600, beatHz: 4, rampFrom: 8, rampTo: 4 },
  { id: 'NV04', filename: 'NV04_Theta_Stabilizer_6', dur: 4500, beatHz: 6 },
  { id: 'NV05', filename: 'NV05_CFC_Theta6_Gamma40', dur: 1800, beatHz: 6 },
  { id: 'NV06', filename: 'NV06_BreathSync_10to6', dur: 2700, beatHz: 6, rampFrom: 10, rampTo: 6 },
  { id: 'NV07', filename: 'NV07_DualBeat_6_12', dur: 2700, beatHz: 6 },
  { id: 'NV08', filename: 'NV08_MicroITD_Drift_6', dur: 2700, beatHz: 6 },
  { id: 'NV09', filename: 'NV09_SpindleBridge_13_bed', dur: 2700, beatHz: 6 },
  { id: 'NV10', filename: 'NV10_Gamma_ASSR_8_40AM', dur: 2700, beatHz: 8 },
  { id: 'NV11', filename: 'NV11_Delta_Gate_4to3', dur: 5400, beatHz: 3, rampFrom: 4, rampTo: 3 },
  { id: 'NV12', filename: 'NV12_Anchor_Return_8to12', dur: 2700, beatHz: 12, rampFrom: 8, rampTo: 12 },
  { id: 'NV13', filename: 'NV13_Schumann_Steps', dur: 2700, beatHz: 7.83, rampFrom: 7.6, rampTo: 8.06 },
  { id: 'NV14', filename: 'NV14_Stochastic_Dither_6', dur: 2700, beatHz: 6, noiseType: 'white' },
  { id: 'NV15', filename: 'NV15_Hemi_Alternator_6_swap10', dur: 2700, beatHz: 6 },
]

for (const t of tracks) {
  generate(t)
}

console.log('\nAll 15 NV tracks generated!')
