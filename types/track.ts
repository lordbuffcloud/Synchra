export type TargetState =
  | 'Focus'
  | 'Deep Sleep'
  | 'Lucid'
  | 'Calm'
  | 'Recovery'
  | 'Custom'
  // NV catalog intents
  | 'Remote Viewing'
  | 'Astral Projection'
  | 'Focused Trance'
  | 'Inner Visuals'
  | 'Memory/Imagery'
  | 'Calm Focus'
  | 'Reintegration'
  | 'Theta Drift'
  | 'Hemispheric Balance'

export interface Track {
  id: string
  title: string
  filenameWebm: string
  filenameAac: string
  remoteWebmUrl?: string
  remoteAacUrl?: string
  durationSec: number
  targetState: TargetState
  baseFreqHz?: number
  beatHz?: number
  tags: string[]
  gainDb?: number
  description?: string
  peaksPath?: string
}

export interface TrackManifest {
  tracks: Track[]
  lastUpdated: string
  totalTracks: number
}