'use client'

import { Track, TargetState } from '@/types/track'
import { Play, Pause, Heart, Clock, Zap, Mic } from 'lucide-react'
import usePlayer from '@/store/usePlayer'
import { getBandByFrequency } from '@/content/binauralScience'
import Link from 'next/link'

interface TrackCardProps {
  track: Track
  className?: string
}

const stateColors: Record<string, { text: string; bg: string; border: string; dot: string }> = {
  'Focus': { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20', dot: 'bg-cyan-400' },
  'Deep Sleep': { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', dot: 'bg-purple-400' },
  'Lucid': { text: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20', dot: 'bg-violet-400' },
  'Calm': { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20', dot: 'bg-green-400' },
  'Recovery': { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', dot: 'bg-orange-400' },
  'Custom': { text: 'text-neon-green', bg: 'bg-neon-green/10', border: 'border-neon-green/20', dot: 'bg-neon-green' },
  'Remote Viewing': { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-400' },
  'Astral Projection': { text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', dot: 'bg-indigo-400' },
  'Focused Trance': { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', dot: 'bg-blue-400' },
  'Inner Visuals': { text: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20', dot: 'bg-pink-400' },
  'Memory/Imagery': { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', dot: 'bg-amber-400' },
  'Calm Focus': { text: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20', dot: 'bg-teal-400' },
  'Reintegration': { text: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20', dot: 'bg-sky-400' },
  'Theta Drift': { text: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20', dot: 'bg-fuchsia-400' },
  'Hemispheric Balance': { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', dot: 'bg-rose-400' },
}

const defaultColors = { text: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20', dot: 'bg-primary' }

const bandColors: Record<string, string> = {
  delta: 'bg-purple-500/15 text-purple-300 border-purple-500/20',
  theta: 'bg-indigo-500/15 text-indigo-300 border-indigo-500/20',
  alpha: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/20',
  beta: 'bg-yellow-500/15 text-yellow-300 border-yellow-500/20',
  gamma: 'bg-orange-500/15 text-orange-300 border-orange-500/20',
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
  const isGuided = track.tags?.includes('guided')
  const colors = stateColors[track.targetState] || defaultColors
  const band = track.beatHz ? getBandByFrequency(track.beatHz) : null
  const bandColor = band ? bandColors[band] || '' : ''

  const handlePlay = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      if (isCurrentTrack && isPlaying) return
      await loadTrack(track, true)
    } catch (error) {
      console.error('Failed to play track:', error)
    }
  }

  const handleFavoriteToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isFavorite) {
      removeFromFavorites(track.id)
    } else {
      addToFavorites(track.id)
    }
  }

  return (
    <Link
      href={`/player/${track.id}`}
      className={`group relative block bg-card border rounded-2xl p-4 transition-all duration-200 hover:shadow-xl hover:shadow-black/20 hover:-translate-y-0.5 ${
        isCurrentTrack
          ? `ring-2 ring-primary/50 ${colors.bg} border-primary/30`
          : 'border-border hover:border-primary/20'
      } ${className}`}
    >
      {/* Top row: state + guided badge + favorite */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <div className={`flex items-center gap-2 px-2.5 py-1 rounded-lg ${colors.bg} border ${colors.border}`}>
            <div className={`w-2 h-2 rounded-full ${colors.dot} ${isCurrentTrack && isPlaying ? 'animate-pulse' : ''}`} />
            <span className={`text-xs font-medium ${colors.text}`}>
              {track.targetState}
            </span>
          </div>
          {isGuided && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/15 border border-amber-500/25">
              <Mic className="w-3 h-3 text-amber-400" />
              <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider">Guided</span>
            </div>
          )}
        </div>

        <button
          onClick={handleFavoriteToggle}
          className={`pointer-events-auto p-1.5 rounded-lg transition-all ${
            isFavorite
              ? 'text-red-400 hover:text-red-300 bg-red-500/10'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
          }`}
          aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
        </button>
      </div>

      {/* Title */}
      <h3 className="font-semibold text-foreground mb-1.5 line-clamp-2 leading-snug group-hover:text-primary transition-colors">
        {track.title}
      </h3>

      {/* Frequency info */}
      {track.beatHz && (
        <div className="flex items-center gap-2 mb-2.5">
          <span className="font-mono text-sm text-primary">{track.beatHz}Hz</span>
          {band && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full capitalize border ${bandColor}`}>
              {band}
            </span>
          )}
        </div>
      )}

      {/* Description */}
      {track.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
          {track.description}
        </p>
      )}

      {/* Footer: duration + tags */}
      <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
        <div className="flex items-center gap-1.5">
          <Clock className="h-3 w-3" />
          <span className="font-mono">{formatDuration(track.durationSec)}</span>
        </div>

        <div className="flex items-center gap-1">
          {track.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 bg-muted/30 rounded-full border border-border/50"
            >
              {tag}
            </span>
          ))}
          {track.tags.length > 2 && (
            <span className="opacity-60">
              +{track.tags.length - 2}
            </span>
          )}
        </div>
      </div>

      {/* Play overlay on hover */}
      <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/0 group-hover:bg-black/30 transition-all duration-200 pointer-events-none">
        <button
          onClick={handlePlay}
          className="pointer-events-auto opacity-0 group-hover:opacity-100 transition-all duration-200 scale-75 group-hover:scale-100"
          aria-label={`Play ${track.title}`}
        >
          <div className="w-14 h-14 rounded-full bg-primary shadow-xl shadow-primary/30 flex items-center justify-center">
            {isCurrentTrack && isPlaying ? (
              <Pause className="w-6 h-6 text-primary-foreground" fill="currentColor" />
            ) : (
              <Play className="w-6 h-6 text-primary-foreground ml-0.5" fill="currentColor" />
            )}
          </div>
        </button>
      </div>

      {/* Current track progress bar */}
      {isCurrentTrack && (
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary/20 rounded-b-2xl overflow-hidden">
          <div
            className={`h-full bg-gradient-to-r from-primary to-neon-green rounded-b-2xl transition-all duration-1000 ${
              isPlaying ? '' : ''
            }`}
            style={{ width: isPlaying ? '100%' : '30%' }}
          />
        </div>
      )}
    </Link>
  )
}
