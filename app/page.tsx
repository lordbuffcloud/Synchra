'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Search, Play, Heart, Clock, Sparkles, Filter, SlidersHorizontal } from 'lucide-react'
import Header from '@/components/Header'
import TrackCard from '@/components/TrackCard'
import SessionStats from '@/components/SessionStats'
import RecommendationsWidget from '@/components/RecommendationsWidget'
import AdvancedSearchModal from '@/components/AdvancedSearchModal'
import { Track, TargetState } from '@/types/track'
import usePlayer from '@/store/usePlayer'

const stateDescriptions: Partial<Record<TargetState, string>> = {
  'Focus': 'Enhanced concentration and productivity',
  'Deep Sleep': 'Restorative sleep and recovery',
  'Lucid': 'Meditation and consciousness exploration',
  'Calm': 'Stress relief and relaxation',
  'Recovery': 'Healing and restoration',
  'Custom': 'Specialized frequencies',
  'Remote Viewing': 'Quiet alertness for analytic imagery and RV sessions.',
  'Astral Projection': 'Theta stabilization and deepening for out-of-body practice.',
  'Focused Trance': 'Tight, intentional trance without fatigue.',
  'Inner Visuals': 'Spacious, stable theta for sustained imagery.',
  'Memory/Imagery': 'Theta core with spindle-friendly modulation for linkage.',
  'Calm Focus': 'Alpha→theta breath-paced steadiness.',
  'Reintegration': 'Clean handoff back to waking via alpha return.',
  'Theta Drift': 'Gentle micro-variation to avoid habituation.',
  'Hemispheric Balance': 'Alternating lateral emphasis for refreshed attention.',
}

export default function HomePage() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [selectedState, setSelectedState] = useState<TargetState | 'All'>('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false)
  const [hasAdvancedFilters, setHasAdvancedFilters] = useState(false)
  const [searchResultsCount, setSearchResultsCount] = useState<number | null>(null)
  const [advancedResults, setAdvancedResults] = useState<Track[] | null>(null)
  
  const { recentTracks, favoriteTracks, currentTrack, initializeAudio } = usePlayer()

  const stateOptions = useMemo(() => {
    return Array.from(new Set(tracks.map(t => t.targetState))) as TargetState[]
  }, [tracks])

  useEffect(() => {
    loadData()
    initializeAudio()
  }, [])

  const loadData = async () => {
    try {
      const { loadTrackManifest } = await import('@/utils/manifest')
      const manifest = await loadTrackManifest()
      setTracks(manifest.tracks)
    } catch (error) {
      console.error('Failed to load tracks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredTracks = useMemo(() => {
    let filtered = tracks

    if (selectedState !== 'All') {
      filtered = filtered.filter((t) => t.targetState === selectedState)
    }

    const q = searchQuery.trim().toLowerCase()
    if (q) {
      const searchTerms = q.split(/\s+/).filter(Boolean)
      filtered = filtered.filter((track) => {
        const searchableText = [
          track.title,
          track.targetState,
          track.description || '',
          ...(track.tags || []),
        ]
          .join(' ')
          .toLowerCase()
        return searchTerms.every((term) => searchableText.includes(term))
      })
    }

    return filtered
  }, [tracks, selectedState, searchQuery])

  const displayedTracks = advancedResults ?? filteredTracks

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
        <section className="text-center mb-8 sm:mb-12 px-2">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4 leading-tight">
            <span className="bg-neon-gradient bg-clip-text text-transparent">
              Tune Probability
            </span>
            <br />
            <span className="text-foreground">With Precision Audio</span>
          </h2>
          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Harness binaural beats for focus, relaxation, and consciousness exploration. 
            Science-backed frequencies for modern minds.
          </p>
          
          {currentTrack && (
            <div className="mt-6 inline-flex items-center space-x-2 px-3 sm:px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-xs sm:text-sm max-w-full">
              <Play className="h-3 w-3 sm:h-4 sm:w-4 text-primary animate-pulse flex-shrink-0" />
              <span className="truncate">Playing: {currentTrack.title}</span>
              <Link href={`/player/${currentTrack.id}`} className="text-primary hover:underline whitespace-nowrap">
                Go to Player →
              </Link>
            </div>
          )}
        </section>

        {/* Session Stats */}
        <SessionStats />

        {/* Recommendations */}
        <RecommendationsWidget />

        {/* Search and Filters */}
        <section className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-4 mb-6">
            {/* Search Row */}
            <div className="flex gap-3">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search tracks, states, frequencies..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    // If the user starts typing, clear advanced override results (they can re-open filters).
                    if (advancedResults) {
                      setAdvancedResults(null)
                      setSearchResultsCount(null)
                      setHasAdvancedFilters(false)
                    }
                  }}
                  className="w-full pl-10 pr-12 py-3 sm:py-3 text-sm sm:text-base bg-card border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus-ring"
                />
                <button
                  onClick={() => setShowAdvancedSearch(true)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1 rounded transition-colors touch-manipulation ${
                    hasAdvancedFilters 
                      ? 'text-primary bg-primary/10' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  title="Advanced search"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </div>
              
              {/* Quick Filters Button */}
              <button
                onClick={() => setShowAdvancedSearch(true)}
                className={`flex items-center space-x-2 px-3 sm:px-4 py-3 border border-border rounded-lg transition-colors whitespace-nowrap touch-manipulation ${
                  hasAdvancedFilters
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card hover:bg-muted/50'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
                {hasAdvancedFilters && (
                  <span className="bg-primary-foreground text-primary text-xs px-1.5 py-0.5 rounded-full font-medium">
                    •
                  </span>
                )}
              </button>
            </div>

            {/* State Filter */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
              <button
                onClick={() => setSelectedState('All')}
                className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-colors touch-manipulation ${
                  selectedState === 'All'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                All
              </button>
              {stateOptions.map((state) => (
                <button
                  key={state}
                  onClick={() => {
                    setSelectedState(state)
                    setAdvancedResults(null)
                    setSearchResultsCount(null)
                    setHasAdvancedFilters(false)
                  }}
                  className={`px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium whitespace-nowrap transition-colors touch-manipulation ${
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
          <section className="mb-8 sm:mb-12">
            <div className="flex items-center justify-between mb-4 sm:mb-6 px-2 sm:px-0">
              <h3 className="text-xl sm:text-2xl font-semibold flex items-center space-x-2">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                <span>Continue Listening</span>
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {getRecentTracksData().slice(0, 4).map((track) => (
                <TrackCard key={track.id} track={track} />
              ))}
            </div>
          </section>
        )}

        {/* Favorites */}
        {!searchQuery && selectedState === 'All' && favoriteTracks.length > 0 && (
          <section className="mb-8 sm:mb-12">
            <div className="flex items-center justify-between mb-4 sm:mb-6 px-2 sm:px-0">
              <h3 className="text-xl sm:text-2xl font-semibold flex items-center space-x-2">
                <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-red-400" />
                <span>Favorites</span>
              </h3>
              <Link 
                href="/library?filter=favorites"
                className="text-primary hover:underline text-xs sm:text-sm"
              >
                View all →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {getFavoriteTracksData().slice(0, 4).map((track) => (
                <TrackCard key={track.id} track={track} />
              ))}
            </div>
          </section>
        )}

        {/* Main Content */}
        {searchQuery || selectedState !== 'All' || hasAdvancedFilters ? (
          // Search Results or Filtered Results
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-semibold">
                  {searchQuery ? `Search Results` : hasAdvancedFilters ? `Filtered Results` : `${selectedState} Tracks`}
                </h3>
                {searchQuery && (
                  <p className="text-sm text-muted-foreground mt-1">
                    for "{searchQuery}"
                    {hasAdvancedFilters && ' with filters applied'}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="text-sm text-muted-foreground">
                  {searchResultsCount !== null ? searchResultsCount : displayedTracks.length} track{(searchResultsCount !== null ? searchResultsCount : displayedTracks.length) !== 1 ? 's' : ''}
                </span>
                {hasAdvancedFilters && (
                  <div className="text-xs text-primary mt-1 flex items-center justify-end space-x-1">
                    <Filter className="w-3 h-3" />
                    <span>Filtered</span>
                  </div>
                )}
              </div>
            </div>
            
            {displayedTracks.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-semibold mb-2">No tracks found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or browse different categories
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                {displayedTracks.map((track) => (
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
              {Array.from(new Set(tracks.map(t => t.targetState))).map((state) => {
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
        
        {/* Advanced Search Modal */}
        <AdvancedSearchModal
          isOpen={showAdvancedSearch}
          onClose={() => setShowAdvancedSearch(false)}
          onApplyFilters={(filters, results) => {
            setAdvancedResults(results)
            setSearchResultsCount(results.length)
            setHasAdvancedFilters(
              filters.targetStates.length > 0 ||
              filters.tags.length > 0 ||
              filters.frequencyRange[0] !== 0.5 ||
              filters.frequencyRange[1] !== 100 ||
              filters.durationRange[0] !== 1 ||
              filters.durationRange[1] !== 180 ||
              filters.sortBy !== 'relevance'
            )
            if (filters.query) {
              setSearchQuery(filters.query)
            }
            setSelectedState('All')
          }}
          initialFilters={{ query: searchQuery }}
        />
      </main>
    </div>
  )
}