export interface BrainwaveBand {
  name: string
  range: string
  description: string
  benefits: string[]
  tips: string[]
  color: string
  bgColor: string
  optimalCarrier: string
  researchNote: string
}

export const brainwaveBands: Record<string, BrainwaveBand> = {
  delta: {
    name: 'Delta',
    range: '0.5-4 Hz',
    description: 'Deep sleep and unconscious healing states. Delta waves promote physical recovery, immune function, and cellular regeneration during restorative sleep cycles. Associated with stages 3-4 NREM sleep where growth hormone release peaks.',
    benefits: [
      'Deep restorative sleep (stages 3-4 NREM)',
      'Growth hormone release and cellular repair',
      'Immune system strengthening',
      'Memory consolidation during sleep',
      'Physical healing acceleration',
      'Cortisol reduction and stress recovery'
    ],
    tips: [
      'Use 30-90 minutes before bedtime for best results',
      'Keep room dark, cool (65-68F), and quiet',
      'Lower volume than other frequencies — subtle is more effective',
      'Avoid caffeine 6+ hours prior for optimal entrainment',
      'Stack with theta (6 Hz) ramp for gradual sleep onset',
      'Pink or brown noise bed enhances the experience'
    ],
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    optimalCarrier: '160-200 Hz',
    researchNote: 'Delta binaural beats have been shown to increase slow-wave sleep duration in controlled studies. The 2-3 Hz range is most effective for deep sleep induction.'
  },

  theta: {
    name: 'Theta',
    range: '4-8 Hz',
    description: 'Hypnagogic creativity and deep meditation. Theta frequencies bridge conscious and unconscious states, facilitating insight, intuition, and emotional processing. The theta-gamma coupling pattern (6 Hz + 40 Hz) is linked to memory consolidation.',
    benefits: [
      'Enhanced creativity and problem-solving insights',
      'Deep meditative states (comparable to experienced meditators)',
      'Emotional processing and trauma resolution',
      'Hypnagogic imagery and lucid dream access',
      'Memory encoding via theta-gamma coupling',
      'Reduced anxiety and stress hormones'
    ],
    tips: [
      'Journal insights immediately after sessions',
      'Use as pre-sleep bridge (theta → delta ramp)',
      'Combine with box breathing (4-4-4-4) for deeper states',
      'Practice in comfortable position with minimal distractions',
      '6 Hz is the most researched theta frequency',
      '4.5 Hz accesses the hypnagogic border for vivid imagery'
    ],
    color: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    optimalCarrier: '200-220 Hz',
    researchNote: 'Cross-frequency coupling between theta (6 Hz) and gamma (40 Hz) oscillations is a biomarker of effective memory consolidation. This pattern occurs naturally during REM sleep.'
  },

  alpha: {
    name: 'Alpha',
    range: '8-12 Hz',
    description: 'Relaxed alertness and flow states. Alpha waves facilitate calm focus, stress reduction, and optimal learning. The Schumann resonance (7.83 Hz) at the theta-alpha border is associated with grounding and coherence.',
    benefits: [
      'Stress reduction and anxiety relief',
      'Enhanced learning and information retention',
      'Flow state access for creative work',
      'Mental clarity and calm decision-making',
      'Emotional balance and resilience',
      'Reduced blood pressure and heart rate'
    ],
    tips: [
      'Pair with Pomodoro technique (25 min focus + 5 min alpha)',
      'Practice 4-6 breaths per minute to amplify alpha',
      '10 Hz is the average individual alpha peak frequency',
      '7.83 Hz (Schumann) is ideal for grounding and calm',
      'Use during light creative tasks, reading, or studying',
      'Alpha sessions make excellent morning or midday resets'
    ],
    color: 'text-cyan-400',
    bgColor: 'bg-cyan-500/10',
    optimalCarrier: '216-230 Hz',
    researchNote: 'Alpha power increase from binaural beats is one of the most replicated findings in the field. 10 Hz binaural beats consistently show EEG alpha enhancement in multiple independent studies.'
  },

  beta: {
    name: 'Beta',
    range: '12-30 Hz',
    description: 'Active concentration and analytical thinking. Beta frequencies enhance cognitive performance, problem-solving, and sustained attention. The sensorimotor rhythm (SMR, 12-15 Hz) is used in ADHD neurofeedback protocols.',
    benefits: [
      'Improved sustained focus and concentration',
      'Enhanced problem-solving and analytical thinking',
      'Increased alertness without anxiety',
      'Better verbal fluency and communication',
      'SMR training benefits for attention disorders',
      'Cognitive performance during demanding tasks'
    ],
    tips: [
      'Use for focused work sprints (20-45 minutes)',
      'Take breaks every 45-60 minutes to prevent overstimulation',
      'Stay well hydrated — cognitive demand increases water needs',
      '14 Hz SMR is gentlest; 18-20 Hz for intense focus',
      'Morning sessions are most effective for beta entrainment',
      'Follow intense beta with alpha cooldown (8-10 Hz)'
    ],
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/10',
    optimalCarrier: '250-280 Hz',
    researchNote: 'SMR (12-15 Hz) neurofeedback is FDA-approved for ADHD treatment. Binaural beats in this range show promising results for attention enhancement in controlled studies.'
  },

  gamma: {
    name: 'Gamma',
    range: '30-80 Hz',
    description: 'High-level cognitive processing and conscious awareness. Gamma waves facilitate binding of information, sudden insights, and peak mental performance. MIT research shows 40 Hz stimulation has neuroprotective properties.',
    benefits: [
      'Enhanced cognitive binding and information integration',
      'Sudden insights and "aha" moments',
      'Heightened sensory awareness and perception',
      'Peak mental performance and reaction time',
      'Neuroprotective effects (40 Hz protocol)',
      'Advanced meditation states (experienced practitioners)'
    ],
    tips: [
      'Use for short bursts only (10-20 minutes)',
      'Stay well-hydrated — gamma is metabolically demanding',
      'Avoid if anxious or prone to overstimulation',
      '40 Hz is the most researched gamma frequency',
      'Isochronic tones at 40 Hz enhance entrainment effectiveness',
      'Follow with alpha or theta cooldown session'
    ],
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    optimalCarrier: '280-320 Hz',
    researchNote: 'MIT/Georgia Tech research demonstrates that 40 Hz sensory stimulation reduces amyloid beta and phosphorylated tau in mouse models. Human clinical trials are underway for Alzheimer\'s prevention.'
  }
}

export const generalTips = [
  'Use quality closed-back headphones for best binaural isolation',
  'Set volume to comfortable level — louder is not better for entrainment',
  'Consistency matters more than intensity — daily 20-minute sessions outperform occasional marathons',
  'Start with shorter sessions (10-15 min) and build up gradually',
  'Pink noise beds help mask environmental distractions',
  'Stack frequencies: theta→delta for sleep, alpha→beta for morning activation',
  'Hydrate well, especially with beta and gamma frequencies',
  'Take breaks between extended sessions (45+ min)',
  'Track your responses — everyone entrains differently',
  'The Schumann resonance (7.83 Hz) is an excellent daily maintenance frequency'
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
    description: 'Extended focus session: SMR warm-up, peak beta, alpha cooldown',
    tracks: ['beta_14hz_smr', 'beta_18hz_focus', 'alpha_10hz_calm'],
    duration: 45,
    sequence: [
      { trackPattern: 'smr', duration: 10 },
      { trackPattern: 'beta', duration: 25 },
      { trackPattern: 'alpha', duration: 10 }
    ]
  },
  {
    name: 'Sleep Protocol 60',
    description: 'Complete sleep preparation: alpha relaxation, theta bridge, delta descent',
    tracks: ['alpha_8hz_relax', 'theta_6hz_meditation', 'delta_2hz_sleep'],
    duration: 60,
    sequence: [
      { trackPattern: 'alpha', duration: 10 },
      { trackPattern: 'theta', duration: 20 },
      { trackPattern: 'delta', duration: 30 }
    ]
  },
  {
    name: 'Calm Reset 10',
    description: 'Quick stress relief with Schumann resonance grounding',
    tracks: ['alpha_7.83hz_schumann'],
    duration: 10,
    sequence: [
      { trackPattern: 'alpha', duration: 10 }
    ]
  },
  {
    name: 'Creative Flow 30',
    description: 'Alpha-theta crossover for creative problem-solving',
    tracks: ['alpha_10hz_calm', 'theta_5hz_creative'],
    duration: 30,
    sequence: [
      { trackPattern: 'alpha', duration: 10 },
      { trackPattern: 'theta', duration: 20 }
    ]
  },
  {
    name: 'Cognitive Boost 20',
    description: '40 Hz gamma protocol for mental clarity and neuroprotection',
    tracks: ['gamma_40hz_cognition'],
    duration: 20,
    sequence: [
      { trackPattern: 'gamma', duration: 20 }
    ]
  }
]
