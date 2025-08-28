export interface BrainwaveBand {
  name: string
  range: string
  description: string
  benefits: string[]
  tips: string[]
}

export const brainwaveBands: Record<string, BrainwaveBand> = {
  delta: {
    name: 'Delta',
    range: '0.5-4 Hz',
    description: 'Deep sleep and unconscious healing states. Delta waves promote physical recovery, immune function, and cellular regeneration during restorative sleep cycles.',
    benefits: [
      'Deep restorative sleep',
      'Physical healing and recovery',
      'Immune system boost',
      'Growth hormone release',
      'Memory consolidation'
    ],
    tips: [
      'Use 30-90 minutes before bedtime',
      'Keep room dark and cool',
      'Lower volume than other frequencies',
      'Avoid caffeine 6+ hours prior',
      'Create consistent sleep routine'
    ]
  },
  
  theta: {
    name: 'Theta',
    range: '4-8 Hz',
    description: 'Hypnagogic creativity and deep meditation. Theta frequencies bridge conscious and unconscious states, facilitating insight, intuition, and emotional processing.',
    benefits: [
      'Enhanced creativity and insight',
      'Deep meditative states',
      'Emotional healing',
      'Memory access',
      'Spiritual experiences'
    ],
    tips: [
      'Journal insights afterward',
      'Use as pre-sleep bridge',
      'Combine with breathwork',
      'Practice in comfortable position',
      'Allow mind to wander freely'
    ]
  },

  alpha: {
    name: 'Alpha',
    range: '8-12 Hz',
    description: 'Relaxed alertness and flow states. Alpha waves facilitate calm focus, stress reduction, and optimal learning while maintaining conscious awareness.',
    benefits: [
      'Stress reduction',
      'Enhanced learning',
      'Flow state access',
      'Mental clarity',
      'Emotional balance'
    ],
    tips: [
      'Pair with Pomodoro technique',
      'Practice 4-6 breaths per minute',
      'Use during light tasks',
      'Take breaks every 45-60 minutes',
      'Combine with nature sounds'
    ]
  },

  beta: {
    name: 'Beta',
    range: '12-30 Hz',
    description: 'Active concentration and analytical thinking. Beta frequencies enhance cognitive performance, problem-solving, and sustained attention for demanding tasks.',
    benefits: [
      'Improved focus and concentration',
      'Enhanced problem-solving',
      'Increased alertness',
      'Better analytical thinking',
      'Cognitive performance boost'
    ],
    tips: [
      'Use for focused work sprints',
      'Take breaks every 45-60 minutes',
      'Stay hydrated',
      'Avoid overstimulation',
      'Balance with alpha sessions'
    ]
  },

  gamma: {
    name: 'Gamma',
    range: '30-80 Hz',
    description: 'High-level cognitive processing and conscious awareness. Gamma waves facilitate binding of information, sudden insights, and peak mental performance.',
    benefits: [
      'Enhanced cognitive binding',
      'Sudden insights and "aha" moments',
      'Heightened awareness',
      'Peak mental performance',
      'Consciousness integration'
    ],
    tips: [
      'Use for short bursts (10-20 min)',
      'Stay well-hydrated',
      'Combine with meditation',
      'Avoid if anxious or overstimulated',
      'Follow with calmer frequencies'
    ]
  }
}

export const generalTips = [
  'Use closed-back headphones for best isolation',
  'Set volume to comfortable level - louder isn\'t better',
  'Consistency matters more than intensity',
  'Start with shorter sessions and build up',
  'Pink noise can help mask distractions',
  'Practice regular sleep hygiene with delta frequencies',
  'Stack theta→delta frequencies for sleep preparation',
  'Hydrate well, especially with higher frequencies',
  'Take breaks between extended sessions',
  'Track your responses in a journal'
]

export function getBandByFrequency(hz: number): string {
  if (hz >= 0.5 && hz <= 4) return 'delta'
  if (hz > 4 && hz <= 8) return 'theta'  
  if (hz > 8 && hz <= 12) return 'alpha'
  if (hz > 12 && hz <= 30) return 'beta'
  if (hz > 30) return 'gamma'
  return 'custom'
}

export const presetSessions = [
  {
    name: 'Deep Focus 45',
    description: 'Extended focus session with beta entrainment',
    tracks: ['beta_20hz_focus', 'alpha_10hz_calm'],
    duration: 45,
    sequence: [
      { trackPattern: 'beta', duration: 35 },
      { trackPattern: 'alpha', duration: 10 }
    ]
  },
  {
    name: 'Lucid 30',
    description: 'Pre-sleep lucidity induction with theta bridge',
    tracks: ['theta_6hz_lucid', 'delta_2hz_sleep'],
    duration: 30,
    sequence: [
      { trackPattern: 'theta', duration: 20 },
      { trackPattern: 'delta', duration: 10 }
    ]
  },
  {
    name: 'Calm Reset 10',
    description: 'Quick stress relief with alpha waves',
    tracks: ['alpha_10hz_calm'],
    duration: 10,
    sequence: [
      { trackPattern: 'alpha', duration: 10 }
    ]
  }
]