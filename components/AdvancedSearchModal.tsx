'use client'

import { useState, useEffect } from 'react'
import { X, Search, Filter, Clock, Zap, Waves } from 'lucide-react'
import { Track, TargetState } from '@/types/track'
import { loadTrackManifest } from '@/utils/manifest'

interface SearchFilters {
  query: string
  targetStates: TargetState[]
  frequencyRange: [number, number]
  durationRange: [number, number] // in minutes
  tags: string[]
  sortBy: 'relevance' | 'duration' | 'frequency' | 'alphabetical' | 'newest'
  sortOrder: 'asc' | 'desc'
}

interface AdvancedSearchModalProps {
  isOpen: boolean
  onClose: () => void
  onApplyFilters: (filters: SearchFilters, results: Track[]) => void
  initialFilters?: Partial<SearchFilters>
}

export default function AdvancedSearchModal({ 
  isOpen, 
  onClose, 
  onApplyFilters, 
  initialFilters = {} 
}: AdvancedSearchModalProps) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])
  const [availableStates, setAvailableStates] = useState<TargetState[]>([])
  const [filters, setFilters] = useState<SearchFilters>({
    query: '',
    targetStates: [],
    frequencyRange: [0.5, 100],
    durationRange: [1, 180], // 1 minute to 3 hours
    tags: [],
    sortBy: 'relevance',
    sortOrder: 'desc',
    ...initialFilters
  })

  useEffect(() => {
    const loadData = async () => {
      try {
        const manifest = await loadTrackManifest()
        setTracks(manifest.tracks)
        
        // Extract all unique tags
        const allTags = new Set<string>()
        manifest.tracks.forEach(track => {
          track.tags?.forEach(tag => allTags.add(tag))
        })
        setAvailableTags(Array.from(allTags).sort())
        
        // Extract all unique states
        const states = Array.from(new Set(manifest.tracks.map(t => t.targetState))).sort()
        setAvailableStates(states)
        
        // Set frequency range based on available tracks
        const frequencies = manifest.tracks
          .map(t => t.beatHz)
          .filter((n): n is number => typeof n === 'number')
        if (frequencies.length > 0) {
          const minFreq = Math.min(...frequencies)
          const maxFreq = Math.max(...frequencies)
          setFilters(prev => ({
            ...prev,
            frequencyRange: [minFreq, maxFreq]
          }))
        }
        
        // Set duration range based on available tracks
        const durations = manifest.tracks.map(t => Math.round(t.durationSec / 60))
        const minDuration = Math.min(...durations)
        const maxDuration = Math.max(...durations)
        setFilters(prev => ({
          ...prev,
          durationRange: [minDuration, maxDuration]
        }))
      } catch (error) {
        console.error('Failed to load tracks for search:', error)
      }
    }

    if (isOpen) {
      loadData()
    }
  }, [isOpen])

  const applyFilters = () => {
    let filtered = [...tracks]

    // Text search
    if (filters.query.trim()) {
      const query = filters.query.toLowerCase()
      filtered = filtered.filter(track => 
        track.title.toLowerCase().includes(query) ||
        track.description?.toLowerCase().includes(query) ||
        track.tags?.some(tag => tag.toLowerCase().includes(query))
      )
    }

    // Target states
    if (filters.targetStates.length > 0) {
      filtered = filtered.filter(track => 
        filters.targetStates.includes(track.targetState)
      )
    }

    // Frequency range
    filtered = filtered.filter(track => 
      !track.beatHz || 
      (track.beatHz >= filters.frequencyRange[0] && track.beatHz <= filters.frequencyRange[1])
    )

    // Duration range (convert to minutes)
    filtered = filtered.filter(track => {
      const durationMins = Math.round(track.durationSec / 60)
      return durationMins >= filters.durationRange[0] && durationMins <= filters.durationRange[1]
    })

    // Tags
    if (filters.tags.length > 0) {
      filtered = filtered.filter(track => 
        track.tags?.some(tag => filters.tags.includes(tag))
      )
    }

    // Sorting
    filtered.sort((a, b) => {
      const multiplier = filters.sortOrder === 'asc' ? 1 : -1
      
      switch (filters.sortBy) {
        case 'alphabetical':
          return a.title.localeCompare(b.title) * multiplier
        case 'duration':
          return (a.durationSec - b.durationSec) * multiplier
        case 'frequency':
          const aFreq = a.beatHz || 0
          const bFreq = b.beatHz || 0
          return (aFreq - bFreq) * multiplier
        case 'newest':
          return a.id.localeCompare(b.id) * multiplier
        case 'relevance':
        default:
          // Simple relevance based on query match strength
          if (!filters.query.trim()) return 0
          const query = filters.query.toLowerCase()
          const aScore = (a.title.toLowerCase().includes(query) ? 2 : 0) +
                        (a.description?.toLowerCase().includes(query) ? 1 : 0) +
                        (a.tags?.some(tag => tag.toLowerCase().includes(query)) ? 1 : 0)
          const bScore = (b.title.toLowerCase().includes(query) ? 2 : 0) +
                        (b.description?.toLowerCase().includes(query) ? 1 : 0) +
                        (b.tags?.some(tag => tag.toLowerCase().includes(query)) ? 1 : 0)
          return (bScore - aScore) * multiplier
      }
    })

    onApplyFilters(filters, filtered)
    onClose()
  }

  const resetFilters = () => {
    setFilters({
      query: '',
      targetStates: [],
      frequencyRange: [0.5, 100],
      durationRange: [1, 180],
      tags: [],
      sortBy: 'relevance',
      sortOrder: 'desc'
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-card border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Advanced Search</h3>
          </div>
          <button 
            onClick={onClose}
            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Search Query */}
          <div>
            <label className="block text-sm font-medium mb-2">Search Terms</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                value={filters.query}
                onChange={(e) => setFilters(prev => ({ ...prev, query: e.target.value }))}
                placeholder="Search titles, descriptions, tags..."
                className="w-full pl-10 pr-4 py-2 bg-background border border-border rounded-lg focus-ring"
              />
            </div>
          </div>

          {/* Target States */}
          <div>
            <label className="block text-sm font-medium mb-2">Target States</label>
            <div className="grid grid-cols-2 gap-2">
              {availableStates.map((state) => (
                <label key={state} className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={filters.targetStates.includes(state)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFilters(prev => ({ 
                          ...prev, 
                          targetStates: [...prev.targetStates, state] 
                        }))
                      } else {
                        setFilters(prev => ({ 
                          ...prev, 
                          targetStates: prev.targetStates.filter(s => s !== state) 
                        }))
                      }
                    }}
                    className="rounded"
                  />
                  <span className="truncate">{state}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Frequency Range */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center space-x-2">
              <Zap className="h-4 w-4" />
              <span>Frequency Range: {filters.frequencyRange[0]}-{filters.frequencyRange[1]} Hz</span>
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="0.5"
                max="100"
                step="0.1"
                value={filters.frequencyRange[0]}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  frequencyRange: [parseFloat(e.target.value), prev.frequencyRange[1]]
                }))}
                className="w-full"
              />
              <input
                type="range"
                min="0.5"
                max="100"
                step="0.1"
                value={filters.frequencyRange[1]}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  frequencyRange: [prev.frequencyRange[0], parseFloat(e.target.value)]
                }))}
                className="w-full"
              />
            </div>
          </div>

          {/* Duration Range */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center space-x-2">
              <Clock className="h-4 w-4" />
              <span>Duration: {filters.durationRange[0]}-{filters.durationRange[1]} minutes</span>
            </label>
            <div className="space-y-2">
              <input
                type="range"
                min="1"
                max="180"
                step="1"
                value={filters.durationRange[0]}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  durationRange: [parseInt(e.target.value), prev.durationRange[1]]
                }))}
                className="w-full"
              />
              <input
                type="range"
                min="1"
                max="180"
                step="1"
                value={filters.durationRange[1]}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  durationRange: [prev.durationRange[0], parseInt(e.target.value)]
                }))}
                className="w-full"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium mb-2 flex items-center space-x-2">
              <Waves className="h-4 w-4" />
              <span>Tags</span>
            </label>
            <div className="max-h-32 overflow-y-auto border border-border rounded-lg p-3">
              <div className="grid grid-cols-2 gap-2">
                {availableTags.slice(0, 20).map((tag) => (
                  <label key={tag} className="flex items-center space-x-2 text-sm">
                    <input
                      type="checkbox"
                      checked={filters.tags.includes(tag)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilters(prev => ({ 
                            ...prev, 
                            tags: [...prev.tags, tag] 
                          }))
                        } else {
                          setFilters(prev => ({ 
                            ...prev, 
                            tags: prev.tags.filter(t => t !== tag) 
                          }))
                        }
                      }}
                      className="rounded"
                    />
                    <span className="truncate">{tag}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Sort Options */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  sortBy: e.target.value as SearchFilters['sortBy']
                }))}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus-ring"
              >
                <option value="relevance">Relevance</option>
                <option value="alphabetical">Alphabetical</option>
                <option value="duration">Duration</option>
                <option value="frequency">Frequency</option>
                <option value="newest">Newest</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Order</label>
              <select
                value={filters.sortOrder}
                onChange={(e) => setFilters(prev => ({ 
                  ...prev, 
                  sortOrder: e.target.value as 'asc' | 'desc'
                }))}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus-ring"
              >
                <option value="desc">High to Low</option>
                <option value="asc">Low to High</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-border">
          <button
            onClick={resetFilters}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Reset All
          </button>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={applyFilters}
              className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}