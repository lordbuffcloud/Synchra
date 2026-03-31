'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { Search, Play, Heart, Clock, Sparkles, Filter, SlidersHorizontal, Brain, Waves, Headphones, ArrowRight, Zap, Moon, Gem, Leaf, Eye, Mic, ChevronRight } from 'lucide-react'
import Header from '@/components/Header'
import TrackCard from '@/components/TrackCard'
import SessionStats from '@/components/SessionStats'
import RecommendationsWidget from '@/components/RecommendationsWidget'
import AdvancedSearchModal from '@/components/AdvancedSearchModal'
import WaveformBackground from '@/components/WaveformBackground'
import { Track, TargetState } from '@/types/track'
import usePlayer from '@/store/usePlayer'

/* ── State icon mapping ─────────────────────────────────────────────── */
const stateIcons: Partial<Record<TargetState, React.ReactNode>> = {
  'Focus':             <Zap className="w-4 h-4 text-yellow-400" />,
  'Deep Sleep':        <Moon className="w-4 h-4 text-indigo-400" />,
  'Lucid':             <Gem className="w-4 h-4 text-cyan-400" />,
  'Calm':              <Leaf className="w-4 h-4 text-green-400" />,
  'Remote Viewing':    <Eye className="w-4 h-4 text-purple-400" />,
  'Astral Projection': <Sparkles className="w-4 h-4 text-amber-300" />,
  'Recovery':          <Heart className="w-4 h-4 text-rose-400" />,
}

/* ── Animated count-up hook ─────────────────────────────────────────── */
function useCountUp(target: number, durationMs = 1200) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    if (target === 0) { setValue(0); return }
    const start = performance.now()
    const step = (now: number) => {
      const elapsed = now - start
      const progress = Math.min(elapsed / durationMs, 1)
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(eased * target))
      if (progress < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(rafRef.current)
  }, [target, durationMs])

  return value
}

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
  'Calm Focus': 'Alpha-theta breath-paced steadiness.',
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

  const displayCount = useCountUp(tracks.length)

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
              <div className="relative w-16 h-16 mx-auto mb-4">
                <div className="absolute inset-0 rounded-full border-2 border-primary/20 animate-ping" />
                <div className="absolute inset-2 rounded-full border-2 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                <div className="absolute inset-4 rounded-full bg-primary/10 flex items-center justify-center">
                  <Waves className="w-5 h-5 text-primary" />
                </div>
              </div>
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
        <section className="text-center mb-10 sm:mb-14 px-2 relative">
          {/* Subtle background glow */}
          <div className="absolute inset-0 -top-20 pointer-events-none overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-[100px]" />
          </div>

          {/* Animated waveform background */}
          <WaveformBackground />

          <div className="relative">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full bg-primary/10 border border-primary/20 text-sm text-primary">
              <Brain className="w-4 h-4" />
              <span>Science-backed neural entrainment</span>
            </div>

            <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-5 leading-tight tracking-tight">
              <span className="bg-neon-gradient bg-clip-text text-transparent">
                Tune Your Mind
              </span>
              <br />
              <span className="text-foreground">With Precision Audio</span>
            </h2>

            {/* Animated stats row */}
            <div className="flex items-center justify-center gap-6 sm:gap-8 mb-6 text-muted-foreground">
              <div className="flex items-center gap-2">
                <Waves className="w-4 h-4 text-primary" />
                <span className="text-lg sm:text-xl font-semibold tabular-nums text-foreground">{displayCount}</span>
                <span className="text-sm sm:text-base">tracks</span>
              </div>
              <span className="text-border">|</span>
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-primary" />
                <span className="text-lg sm:text-xl font-semibold text-foreground">{stateOptions.length}</span>
                <span className="text-sm sm:text-base">states</span>
              </div>
              <span className="text-border hidden sm:inline">|</span>
              <div className="hidden sm:flex items-center gap-1.5">
                <Headphones className="w-4 h-4 text-primary animate-headphone-pulse" />
                <span className="text-sm">Headphones required</span>
              </div>
            </div>

            {/* Mobile headphones indicator */}
            <div className="flex sm:hidden items-center justify-center gap-1.5 mb-6 text-muted-foreground">
              <Headphones className="w-4 h-4 text-primary animate-headphone-pulse" />
              <span className="text-sm">Headphones required for binaural perception</span>
            </div>

            {/* Quick action buttons */}
            <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
              <Link
                href="/studio"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 hover:shadow-primary/30"
              >
                <Sparkles className="w-4 h-4" />
                <span>Open Studio</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/library"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-card border border-border text-foreground rounded-xl font-medium hover:bg-muted/30 transition-all"
              >
                <Headphones className="w-4 h-4" />
                <span>Browse Library</span>
              </Link>
            </div>

            {currentTrack && (
              <div className="inline-flex items-center space-x-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full text-sm">
                <Play className="h-4 w-4 text-primary animate-pulse flex-shrink-0" />
                <span className="truncate">Playing: {currentTrack.title}</span>
                <Link href={`/player/${currentTrack.id}`} className="text-primary hover:underline whitespace-nowrap font-medium">
                  Go to Player
                </Link>
              </div>
            )}
          </div>
        </section>

        {/* Guided Meditations - Featured Section (top of page for visibility) */}
        {(() => {
          const guidedTracks = tracks.filter(t => t.tags?.includes('guided'))
          if (guidedTracks.length === 0) return null
          return (
            <section className="mb-10 sm:mb-14">
              <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-card to-indigo-500/5 p-6 sm:p-8">
                {/* Decorative background */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-500/5 rounded-full blur-[60px] pointer-events-none" />

                <div className="relative">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/25 flex items-center justify-center">
                        <Mic className="w-5 h-5 text-amber-400" />
                      </div>
                      <div>
                        <h3 className="text-xl sm:text-2xl font-bold text-foreground">
                          Guided Meditations
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          Voice-guided sessions with binaural beat backgrounds
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSearchQuery('guided')}
                      className="hidden sm:flex items-center gap-1 text-amber-400 hover:text-amber-300 text-sm font-medium transition-colors"
                    >
                      <span>View all</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Guided track cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {guidedTracks.map((track) => {
                      const level = track.tags?.includes('beginner') ? 'Beginner'
                        : track.tags?.includes('intermediate') ? 'Intermediate'
                        : track.tags?.includes('advanced') ? 'Advanced' : null
                      const levelColor = level === 'Beginner' ? 'text-green-400 bg-green-500/10 border-green-500/20'
                        : level === 'Intermediate' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                        : 'text-red-400 bg-red-500/10 border-red-500/20'

                      return (
                        <Link
                          key={track.id}
                          href={`/player/${track.id}`}
                          className="group relative bg-card/80 backdrop-blur-sm border border-border hover:border-amber-500/30 rounded-xl p-4 transition-all duration-200 hover:shadow-lg hover:shadow-amber-500/5 hover:-translate-y-0.5"
                        >
                          {/* Level badge */}
                          <div className="flex items-center justify-between mb-3">
                            {level && (
                              <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border ${levelColor}`}>
                                {level}
                              </span>
                            )}
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              <span className="font-mono">{Math.floor(track.durationSec / 60)}m</span>
                            </div>
                          </div>

                          {/* Title */}
                          <h4 className="font-semibold text-foreground mb-2 group-hover:text-amber-400 transition-colors leading-snug">
                            {track.title.replace(/^AP0\d\s*-\s*/, '')}
                          </h4>

                          {/* Description */}
                          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mb-3">
                            {track.description}
                          </p>

                          {/* Techniques tags */}
                          <div className="flex flex-wrap gap-1">
                            {track.tags
                              .filter(t => !['guided', 'binaural beats', 'beginner', 'intermediate', 'advanced', 'astral projection', 'theta'].includes(t))
                              .slice(0, 3)
                              .map(tag => (
                                <span key={tag} className="text-[10px] px-1.5 py-0.5 bg-muted/30 rounded border border-border/50 text-muted-foreground">
                                  {tag}
                                </span>
                              ))}
                          </div>

                          {/* Play overlay */}
                          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-black/0 group-hover:bg-black/20 transition-all duration-200 pointer-events-none">
                            <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 scale-75 group-hover:scale-100">
                              <div className="w-12 h-12 rounded-full bg-amber-500 shadow-xl shadow-amber-500/30 flex items-center justify-center">
                                <Play className="w-5 h-5 text-black ml-0.5" fill="currentColor" />
                              </div>
                            </div>
                          </div>
                        </Link>
                      )
                    })}
                  </div>

                  {/* Mobile "View all" */}
                  <button
                    onClick={() => setSearchQuery('guided')}
                    className="sm:hidden mt-4 w-full flex items-center justify-center gap-1 text-amber-400 text-sm font-medium py-2"
                  >
                    <span>View all guided meditations</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </section>
          )
        })()}

        {/* Session Stats */}
        <SessionStats />

        {/* Recommendations */}
        <RecommendationsWidget />

        {/* Search and Filters */}
        <section className="mb-6 sm:mb-8">
          <div className="flex flex-col gap-4 mb-6">
            {/* Search Row */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search tracks, states, frequencies..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value)
                    if (advancedResults) {
                      setAdvancedResults(null)
                      setSearchResultsCount(null)
                      setHasAdvancedFilters(false)
                    }
                  }}
                  className="w-full pl-10 pr-12 py-3 text-sm sm:text-base bg-card border border-border rounded-xl text-foreground placeholder:text-muted-foreground focus-ring"
                />
                <button
                  onClick={() => setShowAdvancedSearch(true)}
                  className={`absolute right-3 top-1/2 transform -translate-y-1/2 p-1.5 rounded-lg transition-colors touch-manipulation ${
                    hasAdvancedFilters
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  }`}
                  title="Advanced search"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => setShowAdvancedSearch(true)}
                className={`flex items-center space-x-2 px-4 py-3 border rounded-xl transition-colors whitespace-nowrap touch-manipulation ${
                  hasAdvancedFilters
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card border-border hover:bg-muted/30'
                }`}
              >
                <Filter className="w-4 h-4" />
                <span className="hidden sm:inline">Filters</span>
                {hasAdvancedFilters && (
                  <span className="bg-primary-foreground text-primary text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                    !
                  </span>
                )}
              </button>
            </div>

            {/* State Filter */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
              <button
                onClick={() => setSelectedState('All')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all touch-manipulation ${
                  selectedState === 'All'
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                    : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/20'
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
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-medium whitespace-nowrap transition-all touch-manipulation ${
                    selectedState === state
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                      : 'bg-card border border-border text-muted-foreground hover:text-foreground hover:border-primary/20'
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
          <section className="mb-10 sm:mb-14">
            <div className="flex items-center justify-between mb-5 px-1">
              <h3 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                <span>Continue Listening</span>
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {getRecentTracksData().slice(0, 4).map((track) => (
                <TrackCard key={track.id} track={track} />
              ))}
            </div>
          </section>
        )}

        {/* Favorites */}
        {!searchQuery && selectedState === 'All' && favoriteTracks.length > 0 && (
          <section className="mb-10 sm:mb-14">
            <div className="flex items-center justify-between mb-5 px-1">
              <h3 className="text-xl sm:text-2xl font-semibold flex items-center gap-2">
                <Heart className="h-5 w-5 sm:h-6 sm:w-6 text-red-400" />
                <span>Favorites</span>
              </h3>
              <Link
                href="/library?filter=favorites"
                className="text-primary hover:underline text-sm font-medium"
              >
                View all
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {getFavoriteTracksData().slice(0, 4).map((track) => (
                <TrackCard key={track.id} track={track} />
              ))}
            </div>
          </section>
        )}

        {/* Main Content */}
        {searchQuery || selectedState !== 'All' || hasAdvancedFilters ? (
          <section>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-2xl font-semibold">
                  {searchQuery ? `Search Results` : hasAdvancedFilters ? `Filtered Results` : `${selectedState} Tracks`}
                </h3>
                {searchQuery && (
                  <p className="text-sm text-muted-foreground mt-1">
                    for &ldquo;{searchQuery}&rdquo;
                    {hasAdvancedFilters && ' with filters applied'}
                  </p>
                )}
              </div>
              <div className="text-right">
                <span className="text-sm text-muted-foreground font-mono">
                  {searchResultsCount !== null ? searchResultsCount : displayedTracks.length} track{(searchResultsCount !== null ? searchResultsCount : displayedTracks.length) !== 1 ? 's' : ''}
                </span>
              </div>
            </div>

            {displayedTracks.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/30 flex items-center justify-center">
                  <Search className="w-7 h-7 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold mb-2">No tracks found</h3>
                <p className="text-muted-foreground">
                  Try adjusting your search or browse different categories
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
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
              <h3 className="text-2xl font-semibold flex items-center gap-2">
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
                    <div className="flex items-center justify-between mb-5 px-1">
                      <div>
                        <h4 className="text-xl font-semibold text-foreground mb-1 flex items-center gap-2">
                          {stateIcons[state]}
                          {state}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          {stateDescriptions[state]}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedState(state)}
                        className="text-primary hover:underline text-sm font-medium flex items-center gap-1"
                      >
                        <span>View all</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
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
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/30 flex items-center justify-center">
              <Waves className="w-7 h-7 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-2">No tracks available</h3>
            <p className="text-muted-foreground mb-4">
              The audio library is empty. Make sure tracks are properly configured.
            </p>
            <Link
              href="/about"
              className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
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
