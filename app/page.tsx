'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Search, Play, Heart, Clock, Sparkles } from 'lucide-react'
import Header from '@/components/Header'
import TrackCard from '@/components/TrackCard'
import { loadTrackManifest, searchTracks, getTracksByState } from '@/utils/manifest'
import { Track, TargetState } from '@/types/track'
import usePlayer from '@/store/usePlayer'

const targetStates: TargetState[] = ['Focus', 'Deep Sleep', 'Lucid', 'Calm', 'Recovery', 'Custom']

const stateDescriptions = {
  'Focus': 'Enhanced concentration and productivity',
  'Deep Sleep': 'Restorative sleep and recovery',
  'Lucid': 'Meditation and consciousness exploration',
  'Calm': 'Stress relief and relaxation',
  'Recovery': 'Healing and restoration',
  'Custom': 'Specialized frequencies',
}

export default function HomePage() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [filteredTracks, setFilteredTracks] = useState<Track[]>([])
  const [selectedState, setSelectedState] = useState<TargetState | 'All'>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  
  const { recentTracks, favoriteTracks, currentTrack, initializeAudio } = usePlayer()

  useEffect(() => {
    loadData()
    initializeAudio()
  }, [])

  useEffect(() => {
    filterTracks()
  }, [tracks, selectedState, searchQuery])

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

  const filterTracks = async () => {
    let filtered = tracks

    if (selectedState !== 'All') {
      filtered = await getTracksByState(selectedState)
    }

    if (searchQuery.trim()) {
      filtered = await searchTracks(searchQuery)
    }

    setFilteredTracks(filtered)
  }

  const getRecentTracksData = () => {
    return recentTracks
      .map(id => tracks.find(track => track.id === id))
      .filter(Boolean) as Track[]
  }

  const getFavoriteTracksData = () => {
    return favoriteTracks
      .map(id => tracks.find(track => track.id === id))
      .filter(Boolean) as Track[]
  }

  const getTracksByStateData = (state: TargetState) => {
    return tracks.filter(track => track.targetState === state).slice(0, 4)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Loading audio library...</p>
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
        {/* Hero Section */}
        <section className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-bold mb-4">
            <span className="bg-neon-gradient bg-clip-text text-transparent">
              Tune Probability
            </span>
            <br />
            <span className="text-foreground">With Precision Audio</span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Harness binaural beats for focus, relaxation, and consciousness exploration. 
            Science-backed frequencies for modern minds.
          </p>
          
          {currentTrack && (
            <div className="mt-6 inline-flex items-center space-x-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-sm">
              <Play className="h-4 w-4 text-primary animate-pulse" />
              <span>Playing: {currentTrack.title}</span>
              <Link href={`/player/${currentTrack.id}`} className="text-primary hover:underline">
                Go to Player →
              </Link>
            </div>
          )}
        </section>

        {/* Search and Filters */}
        <section className="mb-8">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search tracks, states, or frequencies..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus-ring"
              />
            </div>

            {/* State Filter */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 sm:pb-0">
              <button
                onClick={() => setSelectedState('All')}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedState === 'All'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              {targetStates.map((state) => (
                <button
                  key={state}
                  onClick={() => setSelectedState(state)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedState === state
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {state}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Recent Tracks */}
        {!searchQuery && selectedState === 'All' && recentTracks.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold flex items-center space-x-2">
                <Clock className="h-6 w-6 text-primary" />
                <span>Continue Listening</span>
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {getRecentTracksData().slice(0, 4).map((track) => (
                <TrackCard key={track.id} track={track} />
              ))}
            </div>
          </section>
        )}

        {/* Favorites */}
        {!searchQuery && selectedState === 'All' && favoriteTracks.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold flex items-center space-x-2">
                <Heart className="h-6 w-6 text-red-400" />
                <span>Favorites</span>
              </h3>
              <Link 
                href="/library?filter=favorites"
                className="text-primary hover:underline text-sm"
              >
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {getFavoriteTracksData().slice(0, 4).map((track) => (
                <TrackCard key={track.id} track={track} />
              ))}
            </div>
          </section>
        )}

        {/* Main Content */}
        {searchQuery || selectedState !== 'All' ? (
          // Search Results or Filtered Results
          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-semibold">
                {searchQuery ? `Search Results for "${searchQuery}"` : `${selectedState} Tracks`}
              </h3>
              <span className="text-sm text-muted-foreground">
                {filteredTracks.length} track{filteredTracks.length !== 1 ? 's' : ''}
              </span>
            </div>
            
            {filteredTracks.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold mb-2">No tracks found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or browse different categories
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredTracks.map((track) => (
                  <TrackCard key={track.id} track={track} />
                ))}
              </div>
            )}
          </section>
        ) : (
          // Category Grid
          <section>
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-semibold flex items-center space-x-2">
                <Sparkles className="h-6 w-6 text-neon-green" />
                <span>Browse by State</span>
              </h3>
            </div>
            
            <div className="space-y-12">
              {targetStates.map((state) => {
                const stateTracks = getTracksByStateData(state)
                if (stateTracks.length === 0) return null
                
                return (
                  <div key={state}>
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h4 className="text-xl font-semibold text-foreground mb-1">
                          {state}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {stateDescriptions[state]}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedState(state)}
                        className="text-primary hover:underline text-sm"
                      >
                        View all →
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {stateTracks.map((track) => (
                        <TrackCard key={track.id} track={track} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {/* Empty State */}
        {tracks.length === 0 && !isLoading && (
          <section className="text-center py-16">
            <div className="text-6xl mb-4">🎵</div>
            <h3 className="text-xl font-semibold mb-2">No tracks available</h3>
            <p className="text-muted-foreground mb-4">
              The audio library is empty. Make sure tracks are properly configured.
            </p>
            <Link 
              href="/about"
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Learn More
            </Link>
          </section>
        )}
      </main>
    </div>
  )
}