'use client'

import { useEffect, useMemo, useState } from 'react'
import Header from '@/components/Header'
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

const PRESETS: BinauralPreset[] = [
  // ═══ DELTA (0.5-4 Hz) — Deep Sleep & Recovery ═══
  {
    id: 'delta-2hz-deep-sleep',
    name: 'Deep Sleep 2 Hz',
    description: 'Stage 3-4 NREM sleep frequency. Promotes growth hormone release and deep physical restoration.',
    beatHz: 2,
    baseHz: 180,
    category: 'delta',
    hrvHz: 0.067, // ~4 breaths/min for sleep
    noiseAmHz: 2,
    noiseAmDepth: 0.04,
    recommendedMinutes: 60,
    intensity: 'deep',
    tags: ['sleep', 'recovery', 'growth-hormone'],
  },
  {
    id: 'delta-3hz-restoration',
    name: 'Delta Gate 3 Hz',
    description: 'Heavier delta core for sleep onset. Immune system restoration and cellular repair.',
    beatHz: 3,
    baseHz: 200,
    category: 'delta',
    noiseAmHz: 3,
    noiseAmDepth: 0.05,
    recommendedMinutes: 90,
    intensity: 'deep',
    tags: ['sleep', 'immune', 'restoration'],
  },
  {
    id: 'delta-1hz-dreamless',
    name: 'Dreamless Deep 1 Hz',
    description: 'Lowest practical delta frequency. Associated with deepest unconscious healing states.',
    beatHz: 1,
    baseHz: 160,
    category: 'delta',
    hrvHz: 0.05,
    recommendedMinutes: 45,
    intensity: 'deep',
    tags: ['deep-sleep', 'healing', 'unconscious'],
  },
  {
    id: 'delta-ramp-theta-to-delta',
    name: 'Sleep Ramp 6→2 Hz',
    description: 'Gradual theta-to-delta descent mimicking natural sleep onset. 15-minute guided descent.',
    beatHz: 2,
    baseHz: 190,
    category: 'delta',
    ramp: { fromHz: 6, toHz: 2, seconds: 15 * 60 },
    hrvHz: 0.08,
    noiseAmHz: 4,
    noiseAmDepth: 0.04,
    recommendedMinutes: 45,
    intensity: 'gentle',
    tags: ['sleep-onset', 'ramp', 'gradual'],
  },

  // ═══ THETA (4-8 Hz) — Meditation & Creativity ═══
  {
    id: 'theta-6hz-meditation',
    name: 'Theta Stabilizer 6 Hz',
    description: 'Core theta for deep meditation. Facilitates insight, creativity, and emotional processing.',
    beatHz: 6,
    baseHz: 220,
    category: 'theta',
    recommendedMinutes: 30,
    intensity: 'moderate',
    tags: ['meditation', 'creativity', 'insight'],
  },
  {
    id: 'theta-4.5hz-deep',
    name: 'Deep Theta 4.5 Hz',
    description: 'Border of delta/theta. Hypnagogic gateway frequency for vivid imagery and lucid states.',
    beatHz: 4.5,
    baseHz: 210,
    category: 'theta',
    hrvHz: 0.1,
    microItdMs: 1.5,
    recommendedMinutes: 30,
    intensity: 'deep',
    tags: ['hypnagogic', 'lucid', 'imagery'],
  },
  {
    id: 'theta-cfc-gamma',
    name: 'CFC: Theta 6 + Gamma 40',
    description: 'Cross-frequency coupling (theta-gamma). Research links this pattern to memory consolidation and cognitive binding.',
    beatHz: 6,
    baseHz: 220,
    category: 'theta',
    gammaAmHz: 40,
    outAmDepth: 0.018,
    recommendedMinutes: 20,
    intensity: 'moderate',
    tags: ['memory', 'cfc', 'cognitive-binding'],
  },
  {
    id: 'theta-micro-itd',
    name: 'Spatial Theta 6 Hz',
    description: 'Micro interaural time delay creates spacious, 3D perception. Enhances meditation depth.',
    beatHz: 6,
    baseHz: 220,
    category: 'theta',
    microItdMs: 2,
    recommendedMinutes: 25,
    intensity: 'moderate',
    tags: ['spatial', 'meditation', '3d-audio'],
  },
  {
    id: 'theta-hemi-alt',
    name: 'Hemi-Alternator 6 Hz',
    description: 'Alternates emphasis between hemispheres every 10s. Refreshes attention without disrupting theta state.',
    beatHz: 6,
    baseHz: 220,
    category: 'theta',
    hemiSwapSeconds: 10,
    recommendedMinutes: 30,
    intensity: 'moderate',
    tags: ['hemispheric', 'balance', 'alternating'],
  },
  {
    id: 'theta-spindle-bridge',
    name: 'Spindle Bridge 13 Hz AM',
    description: 'Theta with subtle 13 Hz spindle modulation. Sleep spindles consolidate memory during stage 2 sleep.',
    beatHz: 6,
    baseHz: 220,
    category: 'theta',
    outAmHz: 13,
    outAmDepth: 0.012,
    recommendedMinutes: 30,
    intensity: 'moderate',
    tags: ['spindle', 'memory', 'sleep-stage-2'],
  },
  {
    id: 'theta-5hz-creativity',
    name: 'Creative Flow 5 Hz',
    description: 'Mid-theta optimized for creative problem-solving. Used in Monroe Institute protocols for insight access.',
    beatHz: 5,
    baseHz: 215,
    category: 'theta',
    hrvHz: 0.1,
    hemiSwapSeconds: 15,
    recommendedMinutes: 25,
    intensity: 'moderate',
    tags: ['creativity', 'problem-solving', 'insight'],
  },

  // ═══ ALPHA (8-12 Hz) — Relaxed Focus & Flow ═══
  {
    id: 'alpha-schumann',
    name: 'Schumann Hold 7.83 Hz',
    description: "Earth's electromagnetic resonance frequency. Promotes calm grounding and parasympathetic activation.",
    beatHz: 7.83,
    baseHz: 220,
    category: 'alpha',
    hrvHz: 0.1,
    noiseAmHz: 7.83,
    noiseAmDepth: 0.06,
    recommendedMinutes: 30,
    intensity: 'gentle',
    tags: ['schumann', 'grounding', 'calm'],
  },
  {
    id: 'alpha-10hz-peak',
    name: 'Peak Alpha 10 Hz',
    description: 'Individual alpha peak frequency. Optimal for relaxed alertness, flow state, and learning readiness.',
    beatHz: 10,
    baseHz: 220,
    category: 'alpha',
    hrvHz: 0.1,
    recommendedMinutes: 30,
    intensity: 'gentle',
    tags: ['flow', 'learning', 'relaxed-focus'],
  },
  {
    id: 'alpha-ramp-12to7.83',
    name: 'Primer Ramp 12→7.83 Hz',
    description: 'Gentle alpha-to-Schumann glide over 8 minutes. Eases from alertness into calm meditative readiness.',
    beatHz: 7.83,
    baseHz: 220,
    category: 'alpha',
    ramp: { fromHz: 12, toHz: 7.83, seconds: 8 * 60 },
    hrvHz: 0.1,
    noiseAmHz: 7.83,
    noiseAmDepth: 0.05,
    recommendedMinutes: 30,
    intensity: 'gentle',
    tags: ['ramp', 'primer', 'alpha-to-theta'],
  },
  {
    id: 'alpha-8hz-relaxation',
    name: 'Deep Relaxation 8 Hz',
    description: 'Low alpha for deep relaxation without drowsiness. Enhances creativity and reduces anxiety.',
    beatHz: 8,
    baseHz: 216,
    category: 'alpha',
    hrvHz: 0.1,
    noiseAmHz: 8,
    noiseAmDepth: 0.04,
    recommendedMinutes: 20,
    intensity: 'gentle',
    tags: ['relaxation', 'anxiety-relief', 'calm'],
  },

  // ═══ BETA (12-30 Hz) — Focus & Concentration ═══
  {
    id: 'beta-14hz-smr',
    name: 'SMR Focus 14 Hz',
    description: 'Sensorimotor rhythm (12-15 Hz). Enhances focus and calm concentration. Used in ADHD neurofeedback protocols.',
    beatHz: 14,
    baseHz: 250,
    category: 'beta',
    recommendedMinutes: 30,
    intensity: 'moderate',
    tags: ['focus', 'smr', 'adhd', 'concentration'],
  },
  {
    id: 'beta-18hz-active-focus',
    name: 'Active Focus 18 Hz',
    description: 'Mid-beta for engaged analytical thinking. Enhances problem-solving and sustained attention.',
    beatHz: 18,
    baseHz: 270,
    category: 'beta',
    hrvHz: 0.1,
    recommendedMinutes: 25,
    intensity: 'moderate',
    tags: ['focus', 'analytical', 'problem-solving'],
  },
  {
    id: 'beta-20hz-peak',
    name: 'Peak Performance 20 Hz',
    description: 'High-beta for peak cognitive output. Best for demanding tasks requiring intense concentration.',
    beatHz: 20,
    baseHz: 280,
    category: 'beta',
    isochronicHz: 20,
    isochronicDepth: 0.01,
    recommendedMinutes: 20,
    intensity: 'intense',
    tags: ['peak-performance', 'intense-focus', 'demanding-tasks'],
  },
  {
    id: 'beta-ramp-alpha-to-beta',
    name: 'Wake-Up Ramp 8→18 Hz',
    description: 'Morning activation ramp from alpha to beta over 10 minutes. Gentle cognitive warm-up.',
    beatHz: 18,
    baseHz: 260,
    category: 'beta',
    ramp: { fromHz: 8, toHz: 18, seconds: 10 * 60 },
    recommendedMinutes: 15,
    intensity: 'gentle',
    tags: ['morning', 'wake-up', 'activation'],
  },

  // ═══ GAMMA (30-100 Hz) — Cognition & Peak States ═══
  {
    id: 'gamma-40hz-cognition',
    name: 'Gamma 40 Hz Cognition',
    description: '40 Hz gamma linked to cognitive binding and information integration. Research shows neuroprotective effects.',
    beatHz: 40,
    baseHz: 300,
    category: 'gamma',
    hrvHz: 0.1,
    recommendedMinutes: 15,
    intensity: 'intense',
    tags: ['cognition', 'neuroprotection', '40hz-protocol'],
  },
  {
    id: 'gamma-40hz-mit',
    name: 'MIT 40 Hz Protocol',
    description: 'Based on MIT research showing 40 Hz stimulation reduces amyloid plaques. Gentle isochronic overlay for enhanced entrainment.',
    beatHz: 40,
    baseHz: 300,
    category: 'gamma',
    isochronicHz: 40,
    isochronicDepth: 0.015,
    hrvHz: 0.1,
    recommendedMinutes: 60,
    intensity: 'moderate',
    tags: ['mit-protocol', 'neuroprotection', 'amyloid'],
  },
  {
    id: 'gamma-32hz-insight',
    name: 'Insight Gamma 32 Hz',
    description: 'Low gamma associated with sudden insights and "aha" moments. Use during creative problem-solving.',
    beatHz: 32,
    baseHz: 280,
    category: 'gamma',
    recommendedMinutes: 15,
    intensity: 'moderate',
    tags: ['insight', 'aha-moments', 'creativity'],
  },

  // ═══ ADVANCED PROTOCOLS ═══
  {
    id: 'adv-gateway-focus10',
    name: 'Focus 10: Mind Awake, Body Asleep',
    description: 'Inspired by Monroe Institute Focus 10. Theta core with alpha bridge maintains mental awareness while body relaxes deeply.',
    beatHz: 4.5,
    baseHz: 200,
    category: 'advanced',
    secondaryBeatHz: 10,
    hrvHz: 0.1,
    hemiSwapSeconds: 12,
    recommendedMinutes: 30,
    intensity: 'deep',
    tags: ['gateway', 'monroe', 'focus-10', 'obe'],
  },
  {
    id: 'adv-gateway-focus12',
    name: 'Focus 12: Expanded Awareness',
    description: 'Monroe Focus 12 state. Deeper theta with gamma overlay for expanded perception beyond physical senses.',
    beatHz: 4,
    baseHz: 200,
    category: 'advanced',
    gammaAmHz: 40,
    outAmDepth: 0.012,
    hemiSwapSeconds: 8,
    microItdMs: 2,
    recommendedMinutes: 30,
    intensity: 'deep',
    tags: ['gateway', 'monroe', 'focus-12', 'expanded'],
  },
  {
    id: 'adv-lucid-dream',
    name: 'Lucid Dream Induction',
    description: 'Theta-gamma coupling for lucid dream induction. 40 Hz gamma maintains awareness while theta promotes dream state.',
    beatHz: 5.5,
    baseHz: 210,
    category: 'advanced',
    gammaAmHz: 40,
    outAmDepth: 0.02,
    ramp: { fromHz: 8, toHz: 5.5, seconds: 10 * 60 },
    recommendedMinutes: 45,
    intensity: 'deep',
    tags: ['lucid-dreaming', 'awareness', 'theta-gamma'],
  },
  {
    id: 'adv-whole-brain',
    name: 'Whole Brain Sync',
    description: 'Dual-frequency protocol with hemispheric alternation. Promotes bilateral brain coherence and integration.',
    beatHz: 7.83,
    baseHz: 220,
    category: 'advanced',
    secondaryBeatHz: 14,
    hemiSwapSeconds: 8,
    hrvHz: 0.1,
    recommendedMinutes: 25,
    intensity: 'moderate',
    tags: ['whole-brain', 'coherence', 'bilateral'],
  },
  {
    id: 'adv-flow-state',
    name: 'Flow State Protocol',
    description: 'Alpha-theta border with subtle gamma. This crossover zone is where flow states emerge in neurofeedback research.',
    beatHz: 8,
    baseHz: 230,
    category: 'advanced',
    gammaAmHz: 40,
    outAmDepth: 0.008,
    hrvHz: 0.1,
    recommendedMinutes: 45,
    intensity: 'moderate',
    tags: ['flow', 'peak-performance', 'alpha-theta-crossover'],
  },

  // ═══ SOLFEGGIO-CARRIER PRESETS ═══
  {
    id: 'solf-528-theta',
    name: '528 Hz Carrier + Theta',
    description: '528 Hz "transformation" frequency as carrier with 6 Hz theta beat. Combines solfeggio resonance with theta entrainment.',
    beatHz: 6,
    baseHz: 528,
    category: 'solfeggio',
    hrvHz: 0.1,
    recommendedMinutes: 30,
    intensity: 'gentle',
    tags: ['528hz', 'solfeggio', 'transformation', 'healing'],
  },
  {
    id: 'solf-432-alpha',
    name: '432 Hz Carrier + Alpha',
    description: '432 Hz "natural tuning" carrier with 10 Hz alpha beat. Gentle, harmonious relaxation.',
    beatHz: 10,
    baseHz: 432,
    category: 'solfeggio',
    hrvHz: 0.1,
    recommendedMinutes: 30,
    intensity: 'gentle',
    tags: ['432hz', 'natural-tuning', 'harmony'],
  },
  {
    id: 'solf-396-delta',
    name: '396 Hz Carrier + Delta',
    description: '396 Hz "liberation" frequency with 2.5 Hz delta. Deep release and letting go.',
    beatHz: 2.5,
    baseHz: 396,
    category: 'solfeggio',
    hrvHz: 0.067,
    recommendedMinutes: 45,
    intensity: 'deep',
    tags: ['396hz', 'solfeggio', 'liberation', 'release'],
  },
  {
    id: 'solf-639-theta',
    name: '639 Hz Carrier + Theta',
    description: '639 Hz "connection" frequency with 7 Hz theta. Heart-centered meditation and emotional harmonizing.',
    beatHz: 7,
    baseHz: 639,
    category: 'solfeggio',
    hrvHz: 0.1,
    recommendedMinutes: 25,
    intensity: 'gentle',
    tags: ['639hz', 'solfeggio', 'connection', 'heart'],
  },
]

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
                  <button
                    onClick={toggle}
                    className={`flex-shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center transition-all shadow-lg ${
                      isRunning
                        ? 'bg-primary text-primary-foreground shadow-primary/30 hover:bg-primary/90 animate-pulse'
                        : 'bg-muted hover:bg-muted/80 shadow-black/20'
                    }`}
                  >
                    {isRunning ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 ml-0.5" />}
                  </button>
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
