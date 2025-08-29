'use client'

import { Track, TargetState } from '@/types/track'
import { Play, Heart, Clock, Zap } from 'lucide-react'
import usePlayer from '@/store/usePlayer'
import { getBandByFrequency } from '@/content/binauralScience'

interface TrackCardProps {
  track: Track
  className?: string
}

const stateColors: Partial<Record<TargetState, string>> = {
  'Focus': 'text-neon-blue',
  'Deep Sleep': 'text-purple-400',
  'Lucid': 'text-neon-purple',
  'Calm': 'text-green-400',
  'Recovery': 'text-orange-400',
  'Custom': 'text-neon-green',
}

const stateIcons: Partial<Record<TargetState, any>> = {
  'Focus': Zap,
  'Deep Sleep': () => <div className="w-4 h-4 rounded-full bg-purple-400/20 border border-purple-400/40" />,
  'Lucid': () => <div className="w-4 h-4 rounded-full bg-neon-purple/30 animate-pulse" />,
  'Calm': () => <div className="w-4 h-4 rounded-full bg-green-400/20 border border-green-400/40" />,
  'Recovery': () => <div className="w-4 h-4 rounded-full bg-orange-400/20 border border-orange-400/40" />,
  'Custom': () => <div className="w-4 h-4 bg-neon-gradient rounded-sm" />,
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.round(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function TrackCard({ track, className = '' }: TrackCardProps) {
  const { loadTrack, play, currentTrack, isPlaying, favoriteTracks, addToFavorites, removeFromFavorites } = usePlayer()

  const isCurrentTrack = currentTrack?.id === track.id
  const isFavorite = favoriteTracks.includes(track.id)
  const StateIcon = stateIcons[track.targetState] || (() => <div className="w-4 h-4 rounded-full bg-primary/30 border border-primary/40" />)

  const handlePlay = async () => {
    try {
      if (isCurrentTrack && isPlaying) {
        // Already playing this track, don't reload
        return
      }
      
      await loadTrack(track)
      await play()
    } catch (error) {
      console.error('Failed to play track:', error)
    }
  }

  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (isFavorite) {
      removeFromFavorites(track.id)
    } else {
      addToFavorites(track.id)
    }
  }

  const band = track.beatHz ? getBandByFrequency(track.beatHz) : null

  return (
    <div
      className={`group relative bg-card border border-border rounded-lg p-4 micro-motion hover:border-border/60 hover:shadow-lg transition-all duration-200 cursor-pointer ${
        isCurrentTrack ? 'ring-2 ring-primary/50 bg-primary/5' : ''
      } ${className}`}
      onClick={handlePlay}
    >
      {/* Play button overlay */}
      <button
        onClick={handlePlay}
        className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 rounded-lg transition-all duration-200 focus-ring"
        aria-label={`Play ${track.title}`}
      >
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <Play 
            className={`h-12 w-12 text-white drop-shadow-lg ${
              isCurrentTrack && isPlaying ? 'animate-pulse' : ''
            }`}
            fill="currentColor"
          />
        </div>
      </button>

      {/* Content */}
      <div className="relative z-10 pointer-events-none">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            <StateIcon />
            <span className={`text-sm font-medium ${stateColors[track.targetState] || 'text-primary'}`}>
              {track.targetState}
            </span>
          </div>
          
          <button
            onClick={handleFavoriteToggle}
            className={`pointer-events-auto p-1 rounded-full transition-colors focus-ring ${
              isFavorite ? 'text-red-400 hover:text-red-300' : 'text-muted-foreground hover:text-foreground'
            }`}
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-foreground mb-1 line-clamp-2">
          {track.title}
        </h3>

        {/* Frequency info */}
        {track.beatHz && (
          <div className="flex items-center space-x-3 mb-2 text-sm text-muted-foreground">
            <span className="font-mono">{track.beatHz}Hz</span>
            {band && (
              <span className="text-xs px-2 py-1 bg-muted/50 rounded-full capitalize">
                {band}
              </span>
            )}
          </div>
        )}

        {/* Description */}
        {track.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
            {track.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-1">
            <Clock className="h-3 w-3" />
            <span>{formatDuration(track.durationSec)}</span>
          </div>

          {/* Tags */}
          <div className="flex items-center space-x-1">
            {track.tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-xs px-2 py-1 bg-muted/50 rounded-full"
              >
                {tag}
              </span>
            ))}
            {track.tags.length > 2 && (
              <span className="text-xs text-muted-foreground">
                +{track.tags.length - 2}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Current track indicator */}
      {isCurrentTrack && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/20 rounded-b-lg">
          <div 
            className={`h-full bg-primary rounded-b-lg transition-all duration-300 ${
              isPlaying ? 'animate-pulse' : ''
            }`} 
            style={{ width: '30%' }} // TODO: Use actual progress
          />
        </div>
      )}
    </div>
  )
}