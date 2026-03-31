'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Play, Pause, Volume2, VolumeX, X } from 'lucide-react'
import usePlayer from '@/store/usePlayer'

const stateColors: Record<string, { text: string; bg: string; border: string }> = {
  'Focus': { text: 'text-cyan-400', bg: 'bg-cyan-500/10', border: 'border-cyan-500/20' },
  'Deep Sleep': { text: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  'Lucid': { text: 'text-violet-400', bg: 'bg-violet-500/10', border: 'border-violet-500/20' },
  'Calm': { text: 'text-green-400', bg: 'bg-green-500/10', border: 'border-green-500/20' },
  'Recovery': { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20' },
  'Custom': { text: 'text-neon-green', bg: 'bg-neon-green/10', border: 'border-neon-green/20' },
  'Remote Viewing': { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  'Astral Projection': { text: 'text-indigo-400', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
  'Focused Trance': { text: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  'Inner Visuals': { text: 'text-pink-400', bg: 'bg-pink-500/10', border: 'border-pink-500/20' },
  'Memory/Imagery': { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  'Calm Focus': { text: 'text-teal-400', bg: 'bg-teal-500/10', border: 'border-teal-500/20' },
  'Reintegration': { text: 'text-sky-400', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
  'Theta Drift': { text: 'text-fuchsia-400', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/20' },
  'Hemispheric Balance': { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
}

const defaultColors = { text: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' }

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

export default function MiniPlayer() {
  const pathname = usePathname()
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    play,
    pause,
    seek,
    setVolume,
    reset,
  } = usePlayer()

  const [visible, setVisible] = useState(false)

  const isPlayerPage = /^\/player\//.test(pathname)
  const shouldShow = !!currentTrack && !isPlayerPage

  // Delay visibility to trigger CSS transition on mount
  useEffect(() => {
    if (shouldShow) {
      // Small delay so the element renders at translate-y-full first
      const id = requestAnimationFrame(() => setVisible(true))
      return () => cancelAnimationFrame(id)
    } else {
      setVisible(false)
    }
  }, [shouldShow])

  if (!shouldShow) return null

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const colors = currentTrack ? (stateColors[currentTrack.targetState] || defaultColors) : defaultColors

  const handlePlayPause = async () => {
    if (isPlaying) {
      pause()
    } else {
      await play()
    }
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - rect.left
    const pct = x / rect.width
    seek(pct * duration)
  }

  const handleClose = () => {
    pause()
    reset()
  }

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out ${
        visible ? 'translate-y-0' : 'translate-y-full'
      }`}
    >
      {/* Progress bar (top edge) */}
      <div
        className="h-1 bg-border/30 cursor-pointer group"
        onClick={handleProgressClick}
        role="slider"
        aria-label="Seek"
        aria-valuenow={currentTime}
        aria-valuemin={0}
        aria-valuemax={duration}
        tabIndex={0}
      >
        <div
          className="h-full bg-gradient-to-r from-primary to-neon-green transition-[width] duration-150"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Main bar */}
      <div className="bg-background/80 backdrop-blur-xl border-t border-border/50 px-4 py-2.5 safe-area-bottom">
        <div className="container mx-auto flex items-center gap-3 h-[48px]">
          {/* Track info + badge */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Animated playing indicator */}
            <div className="flex items-end gap-[2px] w-4 h-4 shrink-0">
              {isPlaying ? (
                <>
                  <span className="w-[3px] bg-primary rounded-full animate-eq-1" />
                  <span className="w-[3px] bg-primary rounded-full animate-eq-2" />
                  <span className="w-[3px] bg-primary rounded-full animate-eq-3" />
                </>
              ) : (
                <>
                  <span className="w-[3px] h-1 bg-muted-foreground/40 rounded-full" />
                  <span className="w-[3px] h-1.5 bg-muted-foreground/40 rounded-full" />
                  <span className="w-[3px] h-1 bg-muted-foreground/40 rounded-full" />
                </>
              )}
            </div>

            <div className="min-w-0">
              <Link
                href={`/player/${currentTrack.id}`}
                className="block text-sm font-medium text-foreground truncate hover:text-primary transition-colors"
              >
                {currentTrack.title}
              </Link>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-medium ${colors.text}`}>
                  {currentTrack.targetState}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Play / Pause */}
            <button
              onClick={handlePlayPause}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-primary hover:bg-primary/90 active:scale-95 transition-all shadow-lg shadow-primary/20"
              aria-label={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 text-primary-foreground" fill="currentColor" />
              ) : (
                <Play className="w-4 h-4 text-primary-foreground ml-0.5" fill="currentColor" />
              )}
            </button>

            {/* Volume (hidden on very small screens) */}
            <div className="hidden sm:flex items-center gap-1.5 ml-1">
              <button
                onClick={() => setVolume(volume > 0 ? 0 : 0.7)}
                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg"
                aria-label={volume === 0 ? 'Unmute' : 'Mute'}
              >
                {volume === 0 ? (
                  <VolumeX className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20"
                aria-label="Volume"
                style={{
                  background: `linear-gradient(to right, hsl(217, 91%, 60%) 0%, hsl(217, 91%, 60%) ${volume * 100}%, hsl(220, 13%, 18%) ${volume * 100}%, hsl(220, 13%, 18%) 100%)`,
                }}
              />
            </div>

            {/* Close / dismiss */}
            <button
              onClick={handleClose}
              className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-lg ml-0.5"
              aria-label="Close player"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
