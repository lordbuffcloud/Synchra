export type TargetState = 'Focus' | 'Deep Sleep' | 'Lucid' | 'Calm' | 'Recovery' | 'Custom'

export interface Track {
  id: string
  title: string
  filenameWebm: string
  filenameAac: string
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