'use client'

import { useState, useEffect } from 'react'
import { Sparkles, Clock, Target, Heart } from 'lucide-react'
import TrackCard from './TrackCard'
import { Track, TargetState } from '@/types/track'
import usePlayer from '@/store/usePlayer'
import { loadTrackManifest } from '@/utils/manifest'

interface RecommendationReason {
  type: 'similar_to_favorites' | 'complements_recent' | 'time_based' | 'state_progression'
  description: string
  icon: React.ComponentType<{ className?: string }>
}

interface RecommendedTrack extends Track {
  reason: RecommendationReason
  score: number
}

const getRecommendationReason = (track: Track, context: {
  recentStates: TargetState[]
  favoriteStates: TargetState[]
  currentHour: number
}): RecommendationReason => {
  const { recentStates, favoriteStates, currentHour } = context
  
  if (favoriteStates.includes(track.targetState)) {
    return {
      type: 'similar_to_favorites',
      description: `Similar to your favorites in ${track.targetState}`,
      icon: Heart
    }
  }
  
  if (currentHour >= 22 || currentHour <= 6) {
    if (track.targetState === 'Deep Sleep' || track.targetState === 'Calm') {
      return {
        type: 'time_based',
        description: 'Perfect for evening wind-down',
        icon: Clock
      }
    }
  }
  
  if (currentHour >= 6 && currentHour <= 12) {
    if (track.targetState === 'Focus' || track.targetState === 'Focused Trance') {
      return {
        type: 'time_based', 
        description: 'Great for morning productivity',
        icon: Clock
      }
    }
  }
  
  const stateProgression: Record<TargetState, TargetState[]> = {
    'Focus': ['Calm', 'Deep Sleep'],
    'Focused Trance': ['Reintegration', 'Calm Focus'],
    'Deep Sleep': ['Calm', 'Recovery'],
    'Remote Viewing': ['Reintegration', 'Calm Focus'],
    'Astral Projection': ['Reintegration', 'Recovery'],
    'Lucid': ['Calm', 'Recovery'],
    'Calm': ['Focus', 'Deep Sleep'],
    'Recovery': ['Focus', 'Calm Focus'],
    'Custom': ['Focus', 'Calm'],
    'Inner Visuals': ['Reintegration', 'Calm'],
    'Memory/Imagery': ['Reintegration', 'Focus'],
    'Calm Focus': ['Focus', 'Calm'],
    'Reintegration': ['Focus', 'Calm'],
    'Theta Drift': ['Calm Focus', 'Reintegration'],
    'Hemispheric Balance': ['Focus', 'Calm Focus']
  }
  
  for (const recentState of recentStates) {
    if (stateProgression[recentState]?.includes(track.targetState)) {
      return {
        type: 'state_progression',
        description: `Natural follow-up to ${recentState}`,
        icon: Target
      }
    }
  }
  
  return {
    type: 'complements_recent',
    description: 'Based on your listening patterns',
    icon: Sparkles
  }
}

export default function RecommendationsWidget() {
  const { recentTracks, favoriteTracks } = usePlayer()
  const [recommendations, setRecommendations] = useState<RecommendedTrack[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [tracks, setTracks] = useState<Track[]>([])

  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        const manifest = await loadTrackManifest()
        setTracks(manifest.tracks)
        
        const favoriteTrackObjects = manifest.tracks.filter(t => favoriteTracks.includes(t.id))
        const recentTrackObjects = manifest.tracks.filter(t => recentTracks.slice(0, 10).includes(t.id))
        
        const favoriteStates = Array.from(new Set(favoriteTrackObjects.map(t => t.targetState)))
        const recentStates = Array.from(new Set(recentTrackObjects.map(t => t.targetState)))
        const currentHour = new Date().getHours()
        
        // Generate recommendations
        const scored = manifest.tracks
          .filter(track => !recentTracks.slice(0, 5).includes(track.id)) // Exclude very recent
          .map(track => {
            let score = 0
            
            // Boost favorites and similar states
            if (favoriteStates.includes(track.targetState)) score += 50
            
            // Time-based scoring
            if ((currentHour >= 22 || currentHour <= 6) && 
                ['Deep Sleep', 'Calm', 'Recovery'].includes(track.targetState)) {
              score += 40
            } else if (currentHour >= 6 && currentHour <= 12 && 
                      ['Focus', 'Focused Trance', 'Calm Focus'].includes(track.targetState)) {
              score += 40
            } else if (currentHour >= 13 && currentHour <= 18 &&
                      ['Focus', 'Memory/Imagery', 'Hemispheric Balance'].includes(track.targetState)) {
              score += 30
            }
            
            // Frequency preference (if user has pattern)
            const favoriteFreqs = favoriteTrackObjects
              .map(t => t.beatHz)
              .filter((n): n is number => typeof n === 'number')
            if (favoriteFreqs.length > 0 && track.beatHz) {
              const avgFavoriteFreq = favoriteFreqs.reduce((a, b) => a + b, 0) / favoriteFreqs.length
              const freqDistance = Math.abs(track.beatHz - avgFavoriteFreq)
              if (freqDistance < 3) score += 20
            }
            
            // Diversity bonus for trying new states
            if (!recentStates.includes(track.targetState) && !favoriteStates.includes(track.targetState)) {
              score += 15
            }
            
            // Random element for discovery
            score += Math.random() * 10
            
            const reason = getRecommendationReason(track, {
              recentStates,
              favoriteStates, 
              currentHour
            })
            
            return { ...track, reason, score }
          })
          .sort((a, b) => b.score - a.score)
          .slice(0, 6)
        
        setRecommendations(scored)
      } catch (error) {
        console.error('Failed to load recommendations:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadRecommendations()
  }, [recentTracks, favoriteTracks])

  if (isLoading) {
    return (
      <div className="bg-card p-6 rounded-xl mb-8">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-6 h-6 bg-muted rounded animate-pulse" />
          <div className="w-32 h-6 bg-muted rounded animate-pulse" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-muted rounded-lg h-32 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (recommendations.length === 0) return null

  return (
    <div className="bg-gradient-to-br from-primary/5 to-accent/5 p-6 rounded-xl mb-8 border border-primary/10">
      <div className="flex items-center space-x-2 mb-6">
        <Sparkles className="h-6 w-6 text-primary animate-pulse" />
        <h3 className="text-xl font-semibold">Recommended for You</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recommendations.slice(0, 3).map((track) => (
          <div key={track.id} className="relative">
            <TrackCard track={track} />
            
            {/* Recommendation reason */}
            <div className="absolute -top-2 -right-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs flex items-center space-x-1 shadow-lg">
              <track.reason.icon className="w-3 h-3" />
              <span className="sr-only">{track.reason.description}</span>
            </div>
            
            <div className="mt-2 text-xs text-muted-foreground flex items-center space-x-1">
              <track.reason.icon className="w-3 h-3" />
              <span>{track.reason.description}</span>
            </div>
          </div>
        ))}
      </div>
      
      {recommendations.length > 3 && (
        <div className="mt-4 text-center">
          <span className="text-sm text-muted-foreground">
            +{recommendations.length - 3} more recommendations available
          </span>
        </div>
      )}
    </div>
  )
}