'use client'

import { useEffect, useMemo, useState } from 'react'
import Header from '@/components/Header'
import usePlayer from '@/store/usePlayer'
import { BinauralBeatSynth, BinauralPreset } from '@/utils/binauralSynth'
import { Play, Pause, Headphones, Waves, Sparkles } from 'lucide-react'

const PRESETS: BinauralPreset[] = [
  {
    id: 'nv-schumann-7p83',
    name: 'Schumann Hold 7.83 Hz',
    description: 'Stable 7.83 Hz core with gentle breath envelope. Great for calm internal attention.',
    beatHz: 7.83,
    baseHz: 220,
    hrvHz: 0.1,
    noiseAmHz: 7.83,
    noiseAmDepth: 0.06,
  },
  {
    id: 'nv-ramp-12to7p83',
    name: 'Primer Ramp 12 → 7.83 Hz',
    description: 'Alpha→theta glide landing at 7.83 Hz to ease into the session.',
    beatHz: 7.83,
    baseHz: 220,
    ramp: { fromHz: 12, toHz: 7.83, seconds: 8 * 60 },
    hrvHz: 0.1,
    noiseAmHz: 7.83,
    noiseAmDepth: 0.05,
  },
  {
    id: 'nv-theta-6-stabilizer',
    name: 'Theta Stabilizer 6 Hz',
    description: 'A clean 6 Hz core. Pair with pink noise (in Settings) for a smoother bed.',
    beatHz: 6,
    baseHz: 220,
  },
  {
    id: 'nv-theta6-gamma40',
    name: 'CFC: Theta 6 + Gamma 40 (subtle)',
    description: 'Theta core plus a very light 40 Hz tremolo for cross-frequency “sparkle”.',
    beatHz: 6,
    baseHz: 220,
    gammaAmHz: 40,
  },
  {
    id: 'nv-microitd-6',
    name: 'Micro‑ITD Drift 6 Hz',
    description: 'Adds an ultra-slow right-ear micro delay drift for spaciousness.',
    beatHz: 6,
    baseHz: 220,
    microItdMs: 2,
  },
  {
    id: 'nv-hemi-alt-6-swap10',
    name: 'Hemi‑Alternator 6 Hz (swap/10s)',
    description: 'Slowly alternates ear emphasis to refresh lateral attention without harsh jumps.',
    beatHz: 6,
    baseHz: 220,
    hemiSwapSeconds: 10,
  },
  {
    id: 'nv-spindle-bridge-13',
    name: 'Spindle Bridge (13 Hz bed AM)',
    description: 'Theta core with 13 Hz tremolo (very subtle) to nod at spindle dynamics.',
    beatHz: 6,
    baseHz: 220,
    outAmHz: 13,
    outAmDepth: 0.012,
  },
  {
    id: 'nv-delta-3',
    name: 'Delta Gate 3 Hz',
    description: 'Heavier, slower core for sleep onset / deep rest.',
    beatHz: 3,
    baseHz: 200,
  },
]

export default function StudioPage() {
  const { initializeAudio, audioGraph, noiseBus, noiseType, noiseVolume, setNoiseType, setNoiseVolume } = usePlayer()
  const [presetId, setPresetId] = useState(PRESETS[0]!.id)
  const [isRunning, setIsRunning] = useState(false)
  const [level, setLevel] = useState(0.18)

  const preset = useMemo(() => PRESETS.find((p) => p.id === presetId) || PRESETS[0]!, [presetId])

  // Keep a synth instance per session.
  const [synth, setSynth] = useState<BinauralBeatSynth | null>(null)

  useEffect(() => {
    // Don’t force audio start (autoplay policies) — just set up store nodes when possible.
    initializeAudio()
  }, [initializeAudio])

  useEffect(() => {
    if (!audioGraph) return
    if (!synth) {
      setSynth(new BinauralBeatSynth(audioGraph.getContext(), audioGraph.getMasterGain(), { noiseBus: noiseBus || undefined }))
    }
  }, [audioGraph, noiseBus, synth])

  useEffect(() => {
    if (synth?.isStarted()) {
      synth.applyPreset(preset)
    }
  }, [preset, synth])

  useEffect(() => {
    return () => {
      // Ensure synth never continues across navigations.
      if (synth?.isStarted()) synth.stop()
    }
  }, [synth])

  const toggle = async () => {
    await initializeAudio()
    if (!audioGraph) return

    const s =
      synth || new BinauralBeatSynth(audioGraph.getContext(), audioGraph.getMasterGain(), { noiseBus: noiseBus || undefined })
    if (!synth) setSynth(s)

    await audioGraph.resume()

    if (s.isStarted()) {
      s.stop()
      setIsRunning(false)
    } else {
      s.start(preset, level)
      setIsRunning(true)
    }
  }

  const applyLevel = (v: number) => {
    const next = Math.max(0, Math.min(v, 0.35))
    setLevel(next)
    // Smooth live changes (still capped for safety).
    if (synth?.isStarted()) {
      synth.setOutputLevel(next)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        <section className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-neon-green" />
            Binaural Studio
          </h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Live generator for premium binaural patterns. Use <strong>headphones</strong> for true binaural perception.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border text-sm">
            <Headphones className="w-4 h-4 text-primary" />
            <span>
              Safety: start low volume; avoid use while driving; stop if you feel discomfort.
            </span>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-card rounded-xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold mb-1">{preset.name}</h2>
                <p className="text-sm text-muted-foreground">{preset.description}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 rounded-full bg-primary/10 text-primary font-mono">
                    {preset.beatHz} Hz
                  </span>
                  <span className="px-2 py-1 rounded-full bg-muted/50 font-mono">
                    base {preset.baseHz} Hz
                  </span>
                  {preset.hrvHz ? (
                    <span className="px-2 py-1 rounded-full bg-accent/10 text-accent font-mono">
                      HRV {preset.hrvHz} Hz
                    </span>
                  ) : null}
                  {preset.gammaAmHz ? (
                    <span className="px-2 py-1 rounded-full bg-neon-green/10 text-neon-green font-mono">
                      AM {preset.gammaAmHz} Hz
                    </span>
                  ) : null}
                  {preset.microItdMs ? (
                    <span className="px-2 py-1 rounded-full bg-neon-blue/10 text-neon-blue font-mono">
                      micro‑ITD {preset.microItdMs} ms
                    </span>
                  ) : null}
                </div>
              </div>

              <button
                onClick={toggle}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  isRunning ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted hover:bg-muted/80'
                }`}
              >
                {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isRunning ? 'Stop' : 'Start'}</span>
              </button>
            </div>

            <div className="mt-6">
              <label className="block text-sm mb-2">
                Start Level (synth only): <span className="font-mono">{Math.round(level * 100)}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="0.35"
                step="0.01"
                value={level}
                onChange={(e) => applyLevel(parseFloat(e.target.value))}
                className="w-full"
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Tip: for a smoother bed, enable <strong>Pink noise</strong> in the Player Settings (it’s shared globally).
              </p>
            </div>

            <div className="mt-8 border-t border-border pt-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Waves className="w-4 h-4 text-primary" />
                Noise Bed (shared)
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {[
                  { type: null as const, label: 'Off' },
                  { type: 'pink' as const, label: 'Pink' },
                  { type: 'brown' as const, label: 'Brown' },
                  { type: 'white' as const, label: 'White' },
                ].map(({ type, label }) => (
                  <button
                    key={label}
                    onClick={() => setNoiseType(type)}
                    className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                      noiseType === type ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {noiseType ? (
                <div>
                  <label className="block text-sm mb-2">
                    Noise Volume: <span className="font-mono">{Math.round(noiseVolume * 200)}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.01"
                    value={noiseVolume}
                    onChange={(e) => setNoiseVolume(parseFloat(e.target.value))}
                    className="w-full"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Some presets apply subtle <strong>noise AM</strong> (e.g. Schumann / 13 Hz) when the bed is enabled.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Enable a noise type to use bed modulation presets.</p>
              )}
            </div>
          </div>

          <aside className="bg-card rounded-xl p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <Waves className="w-4 h-4 text-primary" />
              Presets
            </h3>

            <div className="space-y-2">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPresetId(p.id)}
                  className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                    p.id === presetId ? 'bg-primary/10 border border-primary/20' : 'bg-muted/30 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{p.name}</span>
                    <span className="text-xs font-mono text-muted-foreground">{p.beatHz}Hz</span>
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-2 mt-1">{p.description}</div>
                </button>
              ))}
            </div>

            <div className="mt-6 text-xs text-muted-foreground">
              If you want these as downloadable files, we can wire the existing Python generator pipeline to export WAV/Opus for
              each preset.
            </div>
          </aside>
        </section>
      </main>
    </div>
  )
}


