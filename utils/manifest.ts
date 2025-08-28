import { TrackManifest, Track } from '@/types/track'

let cachedManifest: TrackManifest | null = null

export async function loadTrackManifest(): Promise<TrackManifest> {
  if (cachedManifest) {
    return cachedManifest
  }

  try {
    const response = await fetch('/tracks/tracks.json', {
      cache: 'force-cache', // Use browser cache
    })
    
    if (!response.ok) {
      throw new Error(`Failed to load manifest: ${response.status} ${response.statusText}`)
    }

    cachedManifest = await response.json()
    return cachedManifest
  } catch (error) {
    console.error('Failed to load track manifest:', error)
    
    // Return empty manifest as fallback
    return {
      tracks: [],
      lastUpdated: new Date().toISOString(),
      totalTracks: 0,
    }
  }
}

export async function getTrack(id: string): Promise<Track | null> {
  const manifest = await loadTrackManifest()
  return manifest.tracks.find(track => track.id === id) || null
}

export async function getTracksByState(targetState: string): Promise<Track[]> {
  const manifest = await loadTrackManifest()
  return manifest.tracks.filter(track => track.targetState === targetState)
}

export async function searchTracks(query: string): Promise<Track[]> {
  const manifest = await loadTrackManifest()
  const searchTerms = query.toLowerCase().split(' ').filter(Boolean)
  
  return manifest.tracks.filter(track => {
    const searchableText = [
      track.title,
      track.targetState,
      track.description || '',
      ...track.tags,
    ].join(' ').toLowerCase()

    return searchTerms.every(term => searchableText.includes(term))
  })
}

export function invalidateCache() {
  cachedManifest = null
}