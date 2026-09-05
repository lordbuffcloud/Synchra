'use client'

import { useEffect, useMemo, useState } from 'react'
import Header from '@/components/Header'
import BackgroundStudioPlayer from '@/components/BackgroundStudioPlayer'
import { PRESETS } from '@/content/studioPresets'
import usePlayer from '@/store/usePlayer'
import { BinauralBeatSynth, BinauralPreset } from '@/utils/binauralSynth'
import { Play, Pause, Headphones, Waves, Sparkles, Brain, Moon, Sun, Zap, Eye, Wind, ChevronDown, ChevronUp, Clock, Shield } from 'lucide-react'

type NoiseTypeOption = 'pink' | 'brown' | 'white' | null

const NOISE_OPTIONS: Array<{ type: NoiseTypeOption; label: string; description: string }> = [
  { type: null, label: 'Off', description: 'No noise bed' },
  { type: 'pink', label: 'Pink', description: 'Warm, natural masking' },
  { type: 'brown', label: 'Brown', description: 'Deep, ocean-like rumble' },
  { type: 'white', label: 'White', description: 'Full-spectrum hiss' },
]

// ─── RESEARCH-BACKED PRESETS ─────────────────────────────────────────────────
// Organized by brainwave category with scientifically-validated frequencies.
// Each preset includes research context, recommended duration, and intensity.

// Category metadata for UI
const CATEGORIES = [
  { id: 'all', label: 'All Presets', icon: Sparkles, color: 'text-neon-green', description: 'Browse all available presets' },
  { id: 'delta', label: 'Delta', icon: Moon, color: 'text-purple-400', description: '0.5-4 Hz — Deep Sleep & Recovery' },
  { id: 'theta', label: 'Theta', icon: Eye, color: 'text-indigo-400', description: '4-8 Hz — Meditation & Creativity' },
  { id: 'alpha', label: 'Alpha', icon: Wind, color: 'text-cyan-400', description: '8-12 Hz — Relaxed Focus & Flow' },
  { id: 'beta', label: 'Beta', icon: Zap, color: 'text-yellow-400', description: '12-30 Hz — Focus & Concentration' },
  { id: 'gamma', label: 'Gamma', icon: Brain, color: 'text-orange-400', description: '30-100 Hz — Cognition & Peak States' },
  { id: 'advanced', label: 'Advanced', icon: Sparkles, color: 'text-neon-purple', description: 'Multi-layer protocols & research-based programs' },
  { id: 'solfeggio', label: 'Solfeggio', icon: Waves, color: 'text-emerald-400', description: 'Sacred frequency carriers (432, 528, 639 Hz)' },
] as const

const intensityColors: Record<string, string> = {
  gentle: 'bg-green-500/20 text-green-400 border-green-500/30',
  moderate: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  deep: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  intense: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
}

export default function StudioPage() {
  const { initializeAudio, audioGraph, noiseBus, noiseType, noiseVolume, setNoiseType, setNoiseVolume } = usePlayer()
  const [presetId, setPresetId] = useState(PRESETS[0]!.id)
  const [backgroundPlayback, setBackgroundPlayback] = useState(true)
  const [isRunning, setIsRunning] = useState(false)
  const [level, setLevel] = useState(0.18)
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [expandedInfo, setExpandedInfo] = useState(false)

  const preset = useMemo(() => PRESETS.find((p) => p.id === presetId) || PRESETS[0]!, [presetId])

  const filteredPresets = useMemo(() => {
    if (selectedCategory === 'all') return PRESETS
    return PRESETS.filter((p) => p.category === selectedCategory)
  }, [selectedCategory])

  // Keep a synth instance per session.
  const [synth, setSynth] = useState<BinauralBeatSynth | null>(null)

  useEffect(() => {
    if (!backgroundPlayback) initializeAudio()
  }, [initializeAudio, backgroundPlayback])

  useEffect(() => {
    if (!audioGraph || backgroundPlayback) return
    if (!synth) {
      setSynth(new BinauralBeatSynth(audioGraph.getContext(), audioGraph.getMasterGain(), { noiseBus: noiseBus || undefined }))
    }
  }, [audioGraph, noiseBus, synth, backgroundPlayback])

  useEffect(() => {
    if (synth?.isStarted()) {
      synth.applyPreset(preset)
    }
  }, [preset, synth])

  useEffect(() => {
    return () => {
      if (synth?.isStarted()) synth.stop()
    }
  }, [synth])

  useEffect(() => {
    const noise = usePlayer.getState().noiseGenerator
    if (!backgroundPlayback && isRunning && noiseType && noise) {
      noise.setType(noiseType)
      noise.setVolume(noiseVolume)
      noise.start()
    } else { noise?.stop() }
    return () => noise?.stop()
  }, [backgroundPlayback, isRunning, noiseType, noiseVolume])

  const toggle = async () => {
    usePlayer.getState().pause()
    await initializeAudio()
    const audioGraph = usePlayer.getState().audioGraph
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
    if (synth?.isStarted()) {
      synth.setOutputLevel(next)
    }
  }

  const categoryInfo = CATEGORIES.find((c) => c.id === preset.category) || CATEGORIES[0]
  const CategoryIcon = categoryInfo.icon

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container mx-auto px-4 py-8">
        {/* Hero */}
        <section className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3 flex items-center gap-3">
            <div className="p-2 rounded-xl bg-neon-gradient">
              <Sparkles className="w-7 h-7 text-black" />
            </div>
            <span>Binaural Studio</span>
          </h1>
          <p className="text-muted-foreground max-w-2xl leading-relaxed">
            Live generator with <strong>{PRESETS.length} research-backed presets</strong> across {CATEGORIES.length - 1} categories.
            Use <strong>headphones</strong> for true binaural perception.
          </p>

          <div className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-sm text-amber-300">
            <Shield className="w-4 h-4 flex-shrink-0" />
            <span>
              Safety: start low volume; avoid use while driving; stop if you feel discomfort.
            </span>
          </div>
        </section>

        <section className="mb-6">
          <label className="flex gap-3 items-center">
            <input type="checkbox" checked={backgroundPlayback} onChange={e => {
              synth?.stop()
              setIsRunning(false)
              setBackgroundPlayback(e.target.checked)
            }} />
            Background playback
          </label>
          {backgroundPlayback && <BackgroundStudioPlayer preset={preset} level={level} noise={noiseType} noiseLevel={noiseVolume} />}
        </section>

        {/* Category Tabs */}
        <section className="mb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {CATEGORIES.map(({ id, label, icon: Icon, color }) => (
              <button
                key={id}
                onClick={() => setSelectedCategory(id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  selectedCategory === id
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'bg-card border border-border hover:border-primary/30 text-muted-foreground hover:text-foreground'
                }`}
              >
                <Icon className={`w-4 h-4 ${selectedCategory === id ? '' : color}`} />
                <span>{label}</span>
                {id !== 'all' && (
                  <span className="text-xs opacity-60">
                    ({PRESETS.filter((p) => p.category === id).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Preset Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Now Playing */}
            <div className="bg-card rounded-2xl p-6 border border-border relative overflow-hidden">
              {/* Subtle gradient background based on category */}
              <div className={`absolute inset-0 opacity-5 bg-gradient-to-br ${
                preset.category === 'delta' ? 'from-purple-500 to-blue-900' :
                preset.category === 'theta' ? 'from-indigo-500 to-purple-900' :
                preset.category === 'alpha' ? 'from-cyan-500 to-blue-900' :
                preset.category === 'beta' ? 'from-yellow-500 to-orange-900' :
                preset.category === 'gamma' ? 'from-orange-500 to-red-900' :
                preset.category === 'solfeggio' ? 'from-emerald-500 to-teal-900' :
                'from-neon-purple to-neon-blue'
              }`} />

              <div className="relative z-10">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <CategoryIcon className={`w-5 h-5 ${categoryInfo.color}`} />
                      <span className={`text-sm font-medium ${categoryInfo.color}`}>
                        {categoryInfo.label}
                      </span>
                      {preset.intensity && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${intensityColors[preset.intensity]}`}>
                          {preset.intensity}
                        </span>
                      )}
                    </div>

                    <h2 className="text-2xl font-bold mb-2">{preset.name}</h2>
                    <p className="text-muted-foreground leading-relaxed">{preset.description}</p>

                    {/* Frequency badges */}
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <span className="px-2.5 py-1 rounded-full bg-primary/15 text-primary font-mono border border-primary/20">
                        {preset.beatHz} Hz beat
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-muted/50 font-mono border border-border">
                        {preset.baseHz} Hz carrier
                      </span>
                      {preset.hrvHz ? (
                        <span className="px-2.5 py-1 rounded-full bg-green-500/10 text-green-400 font-mono border border-green-500/20">
                          HRV {preset.hrvHz} Hz
                        </span>
                      ) : null}
                      {preset.gammaAmHz ? (
                        <span className="px-2.5 py-1 rounded-full bg-orange-500/10 text-orange-400 font-mono border border-orange-500/20">
                          {preset.gammaAmHz} Hz AM
                        </span>
                      ) : null}
                      {preset.outAmHz ? (
                        <span className="px-2.5 py-1 rounded-full bg-yellow-500/10 text-yellow-400 font-mono border border-yellow-500/20">
                          {preset.outAmHz} Hz AM
                        </span>
                      ) : null}
                      {preset.microItdMs ? (
                        <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 text-cyan-400 font-mono border border-cyan-500/20">
                          ITD {preset.microItdMs}ms
                        </span>
                      ) : null}
                      {preset.hemiSwapSeconds ? (
                        <span className="px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 font-mono border border-indigo-500/20">
                          Hemi {preset.hemiSwapSeconds}s
                        </span>
                      ) : null}
                      {preset.isochronicHz ? (
                        <span className="px-2.5 py-1 rounded-full bg-red-500/10 text-red-400 font-mono border border-red-500/20">
                          ISO {preset.isochronicHz} Hz
                        </span>
                      ) : null}
                      {preset.secondaryBeatHz ? (
                        <span className="px-2.5 py-1 rounded-full bg-pink-500/10 text-pink-400 font-mono border border-pink-500/20">
                          +{preset.secondaryBeatHz} Hz layer
                        </span>
                      ) : null}
                      {preset.ramp ? (
                        <span className="px-2.5 py-1 rounded-full bg-violet-500/10 text-violet-400 font-mono border border-violet-500/20">
                          {preset.ramp.fromHz}→{preset.ramp.toHz} Hz ramp
                        </span>
                      ) : null}
                    </div>

                    {/* Recommended duration */}
                    {preset.recommendedMinutes && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Recommended: {preset.recommendedMinutes} min session</span>
                      </div>
                    )}
                  </div>

                  {/* Play/Stop button */}
                  {!backgroundPlayback && (<button
                    onClick={toggle}
                    className={`flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
                      isRunning
                        ? 'bg-primary text-primary-foreground shadow-primary/30 hover:bg-primary/90 animate-pulse'
                        : 'bg-muted hover:bg-muted/80 shadow-black/20'
                    }`}
                  >
                    {isRunning ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
                  </button>)}
                </div>

                {/* Level slider */}
                <div className="mt-6 pt-4 border-t border-border/50">
                  <label className="flex items-center justify-between text-sm mb-2">
                    <span>Synth Level</span>
                    <span className="font-mono text-primary">{Math.round(level * 100)}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.35"
                    step="0.01"
                    value={level}
                    onChange={(e) => applyLevel(parseFloat(e.target.value))}
                    className="w-full"
                    style={{
                      background: `linear-gradient(to right, hsl(217, 91%, 60%) 0%, hsl(217, 91%, 60%) ${(level / 0.35) * 100}%, hsl(215, 14%, 34%) ${(level / 0.35) * 100}%, hsl(215, 14%, 34%) 100%)`
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Noise Bed */}
            <div className="bg-card rounded-2xl p-6 border border-border">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Waves className="w-5 h-5 text-primary" />
                <span>Noise Bed</span>
                <span className="text-xs text-muted-foreground font-normal">(shared with player)</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
                {NOISE_OPTIONS.map(({ type, label, description }) => (
                  <button
                    key={label}
                    onClick={() => setNoiseType(type)}
                    className={`px-4 py-3 text-sm rounded-xl transition-all text-left ${
                      noiseType === type
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                        : 'bg-muted/30 hover:bg-muted/50 border border-border'
                    }`}
                  >
                    <div className="font-medium">{label}</div>
                    <div className={`text-xs mt-0.5 ${noiseType === type ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {description}
                    </div>
                  </button>
                ))}
              </div>

              {noiseType ? (
                <div>
                  <label className="flex items-center justify-between text-sm mb-2">
                    <span>Noise Volume</span>
                    <span className="font-mono text-primary">{Math.round(noiseVolume * 200)}%</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.01"
                    value={noiseVolume}
                    onChange={(e) => setNoiseVolume(parseFloat(e.target.value))}
                    className="w-full"
                    style={{
                      background: `linear-gradient(to right, hsl(217, 91%, 60%) 0%, hsl(217, 91%, 60%) ${(noiseVolume / 0.5) * 100}%, hsl(215, 14%, 34%) ${(noiseVolume / 0.5) * 100}%, hsl(215, 14%, 34%) 100%)`
                    }}
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Some presets apply subtle noise AM modulation when the bed is enabled.
                  </p>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Enable a noise type for ambient masking and bed modulation.</p>
              )}
            </div>

            {/* Science Info (collapsible) */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <button
                onClick={() => setExpandedInfo(!expandedInfo)}
                className="w-full p-5 flex items-center justify-between text-left hover:bg-muted/10 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Headphones className="w-5 h-5 text-primary" />
                  <span className="font-semibold">How Binaural Beats Work</span>
                </div>
                {expandedInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {expandedInfo && (
                <div className="px-5 pb-5 space-y-4 text-sm text-muted-foreground">
                  <p>
                    When two tones of slightly different frequencies are played to each ear through headphones,
                    your brain perceives a third "phantom" tone at the difference frequency. This phenomenon,
                    called frequency-following response (FFR), can guide brainwave activity toward specific states.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/10">
                      <div className="font-medium text-purple-400 mb-1">Delta (0.5-4 Hz)</div>
                      <div className="text-xs">Deep sleep, healing, immune function</div>
                    </div>
                    <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                      <div className="font-medium text-indigo-400 mb-1">Theta (4-8 Hz)</div>
                      <div className="text-xs">Meditation, creativity, insight</div>
                    </div>
                    <div className="p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/10">
                      <div className="font-medium text-cyan-400 mb-1">Alpha (8-12 Hz)</div>
                      <div className="text-xs">Flow state, relaxation, learning</div>
                    </div>
                    <div className="p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                      <div className="font-medium text-yellow-400 mb-1">Beta (12-30 Hz)</div>
                      <div className="text-xs">Focus, concentration, problem-solving</div>
                    </div>
                    <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/10">
                      <div className="font-medium text-orange-400 mb-1">Gamma (30+ Hz)</div>
                      <div className="text-xs">Peak cognition, binding, insight</div>
                    </div>
                    <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                      <div className="font-medium text-emerald-400 mb-1">Advanced</div>
                      <div className="text-xs">Multi-layer protocols, solfeggio carriers</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Preset List */}
          <aside className="space-y-2">
            <h3 className="font-semibold mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Waves className="w-4 h-4 text-primary" />
                Presets
              </span>
              <span className="text-xs text-muted-foreground font-normal">
                {filteredPresets.length} available
              </span>
            </h3>

            <div className="space-y-1.5 max-h-[calc(100vh-200px)] overflow-y-auto scrollbar-hide pr-1">
              {filteredPresets.map((p) => {
                const catInfo = CATEGORIES.find((c) => c.id === p.category) || CATEGORIES[0]
                const CatIcon = catInfo.icon
                return (
                  <button
                    key={p.id}
                    onClick={() => setPresetId(p.id)}
                    className={`w-full text-left px-3.5 py-3 rounded-xl transition-all ${
                      p.id === presetId
                        ? 'bg-primary/10 border-2 border-primary/30 shadow-lg shadow-primary/5'
                        : 'bg-card border border-border hover:border-primary/20 hover:bg-muted/20'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 min-w-0">
                        <CatIcon className={`w-3.5 h-3.5 flex-shrink-0 ${catInfo.color}`} />
                        <span className="text-sm font-medium truncate">{p.name}</span>
                      </div>
                      <span className="text-xs font-mono text-muted-foreground flex-shrink-0">{p.beatHz}Hz</span>
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-2 pl-5.5">{p.description}</div>
                    <div className="flex items-center gap-1.5 mt-1.5 pl-5.5">
                      {p.intensity && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${intensityColors[p.intensity]}`}>
                          {p.intensity}
                        </span>
                      )}
                      {p.recommendedMinutes && (
                        <span className="text-[10px] text-muted-foreground">
                          {p.recommendedMinutes}min
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </aside>
        </section>
      </main>
    </div>
  )
}
