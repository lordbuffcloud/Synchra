'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, Filter, Heart, Clock, Download, Trash2, RefreshCw, Mic } from 'lucide-react'
import Header from '@/components/Header'
import TrackCard from '@/components/TrackCard'
import ListeningAnalytics from '@/components/ListeningAnalytics'
import { loadTrackManifest, searchTracks, getTracksByState } from '@/utils/manifest'
import { Track, TargetState } from '@/types/track'
import usePlayer from '@/store/usePlayer'

const targetStates: (TargetState | 'All')[] = [
  'All',
  'Focus',
  'Deep Sleep',
  'Lucid',
  'Calm',
  'Recovery',
  'Custom',
  // NV intents
  'Remote Viewing',
  'Astral Projection',
  'Focused Trance',
  'Inner Visuals',
  'Memory/Imagery',
  'Calm Focus',
  'Reintegration',
  'Theta Drift',
  'Hemispheric Balance',
]

function LibraryPageClient() {
  const searchParams = useSearchParams()
  const initialFilter = searchParams.get('filter') as TargetState | 'favorites' | null

  const [tracks, setTracks] = useState<Track[]>([])
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([])
  const [selectedState, setSelectedState] = useState<TargetState | 'All' | 'favorites' | 'guided'>(
    initialFilter || 'All'
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'duration' | 'recent' | 'frequency'>('name')
  const [isLoading, setIsLoading] = useState(true)
  const [showImportStatus, setShowImportStatus] = useState(false)
  const [cacheStatus, setCacheStatus] = useState<any>(null)
  
  const { recentTracks, favoriteTracks } = usePlayer()

  useEffect(() => {
    loadData()
    loadCacheStatus()
  }, [])

  useEffect(() => {
    filterAndSortTracks()
  }, [tracks, selectedState, searchQuery, sortBy])

  const loadData = async () => {
    try {
      const manifest = await loadTrackManifest()
      setTracks(manifest.tracks)
    } catch (error) {
      console.error('Failed to load tracks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const loadCacheStatus = async () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      try {
        const messageChannel = new MessageChannel()
        messageChannel.port1.onmessage = (event) => {
          if (event.data.type === 'CACHE_STATUS') {
            setCacheStatus(event.data.data)
          }
        }
        
        navigator.serviceWorker.controller.postMessage(
          { type: 'GET_CACHE_STATUS' },
          [messageChannel.port2]
        )
      } catch (error) {
        console.warn('Failed to get cache status:', error)
      }
    }
  }

  const filterAndSortTracks = async () => {
    let filtered = tracks

    // Apply state/category filter
    if (selectedState === 'favorites') {
      filtered = favoriteTracks
        .map(id => tracks.find(track => track.id === id))
        .filter(Boolean) as Track[]
    } else if (selectedState === 'guided') {
      filtered = tracks.filter(track => track.tags?.includes('guided'))
    } else if (selectedState !== 'All') {
      filtered = await getTracksByState(selectedState as TargetState)
    }

    // Apply search filter
    if (searchQuery.trim()) {
      filtered = await searchTracks(searchQuery)
      if (selectedState === 'favorites') {
        filtered = filtered.filter(track => favoriteTracks.includes(track.id))
      } else if (selectedState !== 'All') {
        filtered = filtered.filter(track => track.targetState === selectedState)
      }
    }

    // Apply sorting
    const sortedTracks = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.title.localeCompare(b.title)
        case 'duration':
          return b.durationSec - a.durationSec
        case 'frequency':
          return (b.beatHz || 0) - (a.beatHz || 0)
        case 'recent':
          const aIndex = recentTracks.indexOf(a.id)
          const bIndex = recentTracks.indexOf(b.id)
          if (aIndex === -1 && bIndex === -1) return a.title.localeCompare(b.title)
          if (aIndex === -1) return 1
          if (bIndex === -1) return -1
          return aIndex - bIndex
        default:
          return 0
      }
    })

    setFilteredTracks(sortedTracks)
  }

  const handleCacheTrack = async (track: Track) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const urls = [
        track.remoteWebmUrl || `/tracks/${track.filenameWebm}`,
        track.remoteAacUrl || `/tracks/${track.filenameAac}`
      ]
      
      for (const url of urls) {
        navigator.serviceWorker.controller.postMessage({
          type: 'CACHE_AUDIO',
          data: { url }
        })
      }
    }
  }

  const handleClearCache = async () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const messageChannel = new MessageChannel()
      messageChannel.port1.onmessage = (event) => {
        if (event.data.type === 'CACHE_CLEARED') {
          setCacheStatus(null)
          loadCacheStatus()
        }
      }
      
      navigator.serviceWorker.controller.postMessage(
        { type: 'CLEAR_CACHE' },
        [messageChannel.port2]
      )
    }
  }

  const handleRefreshTracks = async () => {
    setIsLoading(true)
    try {
      // Invalidate cache and reload
      if ('caches' in window) {
        await caches.delete('synchra-audio-v1')
      }
      await loadData()
    } catch (error) {
      console.error('Failed to refresh tracks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Loading library...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Audio Library</h1>
            <p className="text-muted-foreground">
              {tracks.length} tracks • {filteredTracks.length} shown
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefreshTracks}
              disabled={isLoading}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors focus-ring rounded-lg"
              title="Refresh tracks"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            <button
              onClick={() => setShowImportStatus(!showImportStatus)}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors focus-ring rounded-lg"
              title="Import status"
            >
              <Download className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Import Status Panel */}
        {showImportStatus && (
          <div className="bg-card rounded-lg p-6 mb-8">
            <h3 className="font-semibold mb-4 flex items-center space-x-2">
              <Download className="w-5 h-5" />
              <span>Offline & Cache Status</span>
            </h3>
            
            {cacheStatus ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="text-center p-4 bg-muted/20 rounded-lg">
                  <div className="text-2xl font-bold text-primary">{cacheStatus.staticCachedCount}</div>
                  <div className="text-sm text-muted-foreground">Static Files Cached</div>
                </div>
                
                <div className="text-center p-4 bg-muted/20 rounded-lg">
                  <div className="text-2xl font-bold text-neon-green">{cacheStatus.audioCachedCount}</div>
                  <div className="text-sm text-muted-foreground">Audio Files Cached</div>
                </div>
                
                <div className="text-center p-4 bg-muted/20 rounded-lg">
                  <div className="text-2xl font-bold text-neon-purple">~{Math.round(cacheStatus.totalSize / 1024)}KB</div>
                  <div className="text-sm text-muted-foreground">Est. Cache Size</div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading cache status...</p>
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Cached tracks are available offline. Use "Make Available Offline" on individual tracks.
              </p>
              
              <button
                onClick={handleClearCache}
                className="flex items-center space-x-2 px-4 py-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors text-sm"
              >
                <Trash2 className="w-4 h-4" />
                <span>Clear Cache</span>
              </button>
            </div>
          </div>
        )}

        {/* Analytics */}
        <ListeningAnalytics />

        {/* Controls */}
        <div className="space-y-4 mb-8">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search tracks, frequencies, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus-ring"
            />
          </div>

          {/* Filters and Sort */}
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Category Filter */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 sm:pb-0">
              <Filter className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              {([...(targetStates as (TargetState | 'All')[]), 'guided', 'favorites'] as Array<TargetState | 'All' | 'favorites' | 'guided'>).map((state) => (
                <button
                  key={state}
                  onClick={() => setSelectedState(state)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors flex items-center space-x-1 ${
                    selectedState === state
                      ? state === 'guided' ? 'bg-amber-500 text-black' : 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {state === 'favorites' && <Heart className="w-3 h-3" />}
                  {state === 'guided' && <Mic className="w-3 h-3" />}
                  <span>{state === 'favorites' ? 'Favorites' : state === 'guided' ? 'Guided' : state}</span>
                  {state === 'favorites' && (
                    <span className="text-xs opacity-75">({favoriteTracks.length})</span>
                  )}
                  {state === 'guided' && (
                    <span className="text-xs opacity-75">({tracks.filter(t => t.tags?.includes('guided')).length})</span>
                  )}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-card border border-border rounded-lg px-3 py-2 text-sm focus-ring"
              >
                <option value="name">Name</option>
                <option value="duration">Duration</option>
                <option value="frequency">Frequency</option>
                <option value="recent">Recently Played</option>
              </select>
            </div>
          </div>
        </div>

        {/* Track Grid */}
        {filteredTracks.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">
              {selectedState === 'favorites' ? '💝' : searchQuery ? '🔍' : '🎵'}
            </div>
            <h3 className="text-xl font-semibold mb-2">
              {selectedState === 'favorites'
                ? 'No favorites yet'
                : selectedState === 'guided'
                ? 'No guided meditations'
                : searchQuery
                ? 'No tracks found'
                : 'No tracks available'
              }
            </h3>
            <p className="text-muted-foreground">
              {selectedState === 'favorites'
                ? 'Add tracks to favorites by clicking the heart icon'
                : selectedState === 'guided'
                ? 'Guided meditations with voice narration will appear here'
                : searchQuery
                ? 'Try adjusting your search terms or browse different categories'
                : 'The audio library is empty. Check your track configuration.'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredTracks.map((track) => (
              <div key={track.id} className="relative group">
                <TrackCard track={track} />
                
                {/* Offline Actions */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleCacheTrack(track)}
                    className="p-2 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors"
                    title="Make available offline"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {tracks.length > 0 && (
          <div className="mt-12 pt-8 border-t border-border">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">{tracks.length}</div>
                <div className="text-sm text-muted-foreground">Total Tracks</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-neon-green">
                  {Math.round(tracks.reduce((sum, track) => sum + track.durationSec, 0) / 3600)}h
                </div>
                <div className="text-sm text-muted-foreground">Total Duration</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-neon-purple">{favoriteTracks.length}</div>
                <div className="text-sm text-muted-foreground">Favorites</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-neon-blue">{recentTracks.length}</div>
                <div className="text-sm text-muted-foreground">Recently Played</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function LibraryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background"><div className="container mx-auto px-4 py-8"><div className="flex items-center justify-center min-h-[50vh]"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div></div></div>}>
      <LibraryPageClient />
    </Suspense>
  )
}