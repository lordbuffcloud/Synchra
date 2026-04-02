'use client'

import { useEffect, useMemo, useState } from 'react'
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Heart, Repeat, Timer, Settings, Waves, ChevronDown, ChevronUp } from 'lucide-react'
import usePlayer from '@/store/usePlayer'
import { Track } from '@/types/track'
import { brainwaveBands, getBandByFrequency } from '@/content/binauralScience'
import AudioVisualizer from '@/components/AudioVisualizer'

interface PlayerProps {
  track?: Track
  className?: string
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function ProgressRing({
  progress,
  peaks,
  size = 200,
  bandColor = '#3b82f6',
  className = '',
}: {
  progress: number
  peaks?: number[]
  size?: number
  bandColor?: string
  className?: string
}) {
  const strokeWidth = 6
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDashoffset = circumference - (progress / 100) * circumference
  const peakCount = 80

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-border/50"
        />

        {/* Waveform visualization */}
        {peaks && (
          <g className="opacity-20">
            {peaks.slice(0, peakCount).map((peak, i) => {
              const angle = (i / peakCount) * 2 * Math.PI
              const innerR = radius - 24
              const x1 = size / 2 + innerR * Math.cos(angle)
              const y1 = size / 2 + innerR * Math.sin(angle)
              const peakHeight = Math.abs(peak) * 0.35 + 1.5
              const x2 = size / 2 + (innerR + peakHeight) * Math.cos(angle)
              const y2 = size / 2 + (innerR + peakHeight) * Math.sin(angle)

              const isPast = (i / peakCount) * 100 <= progress

              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={isPast ? bandColor : 'currentColor'}
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  className={isPast ? '' : 'text-muted-foreground/30'}
                  opacity={isPast ? 0.8 : 0.4}
                />
              )
            })}
          </g>
        )}

        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#player-gradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />

        {/* Gradient definition */}
        <defs>
          <linearGradient id="player-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00d4ff" />
            <stop offset="50%" stopColor="#b347d9" />
            <stop offset="100%" stopColor="#39ff14" />
          </linearGradient>
        </defs>
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-bold font-mono tracking-tight">
            {Math.round(progress)}%
          </div>
        </div>
      </div>
    </div>
  )
}

export default function Player({ track: initialTrack, className = '' }: PlayerProps) {
  const {
    currentTrack,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    volume,
    loopEnabled,
    normalizeEnabled,
    crossfadeDuration,
    timerMinutes,
    timerStartTime,
    noiseType,
    noiseVolume,
    favoriteTracks,
    loadTrack,
    play,
    pause,
    seek,
    setVolume,
    setLoopEnabled,
    setNormalizeEnabled,
    setCrossfadeDuration,
    setTimer,
    setNoiseType,
    setNoiseVolume,
    addToFavorites,
    removeFromFavorites,
  } = usePlayer()

  const [showSettings, setShowSettings] = useState(false)
  const [peaks, setPeaks] = useState<number[]>([])
  const [customTimerInput, setCustomTimerInput] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [touchStartY, setTouchStartY] = useState<number | null>(null)

  const track = currentTrack || initialTrack

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const isFavorite = track ? favoriteTracks.includes(track.id) : false
  const ringSize = useMemo(() => 260, [])
  const band = track?.beatHz ? getBandByFrequency(track.beatHz) : null
  const bandInfo = band ? brainwaveBands[band] : null
  const bandColor = bandInfo?.color?.replace('text-', '') || '#3b82f6'

  // Map band color class to hex for SVG
  const bandColorHex = band === 'delta' ? '#a855f7' :
                       band === 'theta' ? '#818cf8' :
                       band === 'alpha' ? '#22d3ee' :
                       band === 'beta' ? '#facc15' :
                       band === 'gamma' ? '#fb923c' : '#3b82f6'

  // Load peaks data
  useEffect(() => {
    if (track?.peaksPath) {
      fetch(`/tracks/${track.peaksPath}`)
        .then(res => res.json())
        .then(data => setPeaks(data.peaks || []))
        .catch(() => setPeaks([]))
    } else {
      setPeaks([])
    }
  }, [track?.peaksPath])

  // Keyboard controls
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return

      switch (e.key) {
        case ' ':
          e.preventDefault()
          isPlaying ? pause() : play()
          break
        case 'ArrowLeft':
          seek(Math.max(0, currentTime - 10))
          break
        case 'ArrowRight':
          seek(Math.min(duration, currentTime + 10))
          break
        case 'ArrowUp':
          e.preventDefault()
          setVolume(Math.min(1, volume + 0.1))
          break
        case 'ArrowDown':
          e.preventDefault()
          setVolume(Math.max(0, volume - 0.1))
          break
        case 't':
        case 'T':
          setShowSettings(!showSettings)
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [isPlaying, currentTime, duration, volume, showSettings, pause, play, seek, setVolume])

  // Touch gestures for mobile
  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      if (e.target instanceof HTMLElement && !e.target.closest('.player-container')) return
      setTouchStartY(e.touches[0].clientY)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchStartY || isDragging) return

      const touchY = e.touches[0].clientY
      const deltaY = touchStartY - touchY

      if (Math.abs(deltaY) > 50) {
        e.preventDefault()
        const volumeChange = deltaY / 200
        const newVolume = Math.max(0, Math.min(1, volume + volumeChange))
        setVolume(newVolume)
        setTouchStartY(touchY)
      }
    }

    const handleTouchEnd = () => {
      setTouchStartY(null)
    }

    window.addEventListener('touchstart', handleTouchStart, { passive: true })
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)

    return () => {
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
  }, [touchStartY, volume, isDragging])

  const handlePlayPause = async () => {
    if (!track) return

    if (isPlaying) {
      pause()
    } else {
      // Always reload if track isn't loaded or audio setup incomplete
      const state = usePlayer.getState()
      if (currentTrack?.id !== track.id || !state.activeMediaSlot || !state.audioGraph) {
        await loadTrack(track)
      }
      await play()
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLElement>) => {
    if (!duration) return

    const rect = e.currentTarget.getBoundingClientRect()
    const centerX = rect.left + rect.width / 2
    const centerY = rect.top + rect.height / 2
    const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX)
    const normalizedAngle = (angle + Math.PI / 2 + 2 * Math.PI) % (2 * Math.PI)
    const progress = normalizedAngle / (2 * Math.PI)
    const newTime = progress * duration
    seek(newTime)
  }

  const handleFavoriteToggle = () => {
    if (!track) return
    if (isFavorite) {
      removeFromFavorites(track.id)
    } else {
      addToFavorites(track.id)
    }
  }

  const handleTimerSet = (minutes: number | null) => {
    setTimer(minutes)
  }

  const handleCustomTimer = () => {
    const minutes = parseInt(customTimerInput)
    if (minutes > 0 && minutes <= 999) {
      handleTimerSet(minutes)
      setCustomTimerInput('')
    }
  }

  const remainingTime = timerMinutes && timerStartTime
    ? Math.max(0, (timerMinutes * 60 * 1000) - (Date.now() - timerStartTime))
    : null

  if (!track) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] text-center ${className}`}>
        <div>
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/30 flex items-center justify-center">
            <Waves className="w-7 h-7 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No track selected</h3>
          <p className="text-muted-foreground">Choose a track to start listening</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`player-container bg-card rounded-2xl p-5 sm:p-8 ${className} select-none border border-border`}>
      {/* Track Info */}
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-2 leading-tight px-2">{track.title}</h2>
        <p className="text-muted-foreground mb-3 text-sm sm:text-base px-2 line-clamp-2">{track.description}</p>

        {track.beatHz && (
          <div className="flex items-center justify-center flex-wrap gap-2 text-sm px-2">
            <span className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg font-mono text-xs sm:text-sm border border-primary/20">
              {track.beatHz}Hz
            </span>
            {band && bandInfo && (
              <span className={`px-3 py-1.5 ${bandInfo.bgColor} ${bandInfo.color} rounded-lg text-xs sm:text-sm border ${bandInfo.bgColor.replace('/10', '/20')}`}>
                {bandInfo.name} waves
              </span>
            )}
            <span className="px-3 py-1.5 bg-accent/10 text-accent rounded-lg text-xs sm:text-sm border border-accent/20">
              {track.targetState}
            </span>
          </div>
        )}
      </div>

      {/* Main Player Controls */}
      <div className="flex items-center justify-center mb-6 sm:mb-8">
        <div className="relative">
          <ProgressRing
            progress={progress}
            peaks={peaks}
            size={ringSize}
            bandColor={bandColorHex}
            className="w-[220px] h-[220px] sm:w-[260px] sm:h-[260px]"
          />

          {/* Seekable overlay */}
          <button
            type="button"
            aria-label="Seek"
            className="absolute inset-0 z-0 cursor-pointer rounded-full"
            onClick={handleSeek}
          />

          {/* Center Play Button */}
          <button
            onClick={handlePlayPause}
            disabled={isLoading}
            className="absolute inset-0 z-10 flex items-center justify-center touch-manipulation"
          >
            <div className={`w-16 h-16 sm:w-18 sm:h-18 bg-primary hover:bg-primary/90 active:scale-95 rounded-full flex items-center justify-center transition-all shadow-xl shadow-primary/30 ${isPlaying ? 'animate-gentle-pulse' : ''}`}>
              {isLoading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-7 h-7 text-primary-foreground" fill="currentColor" />
              ) : (
                <Play className="w-7 h-7 text-primary-foreground ml-0.5" fill="currentColor" />
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Audio Visualizer */}
      <AudioVisualizer
        isPlaying={isPlaying}
        bandColor={bandColorHex}
        barCount={40}
        className="mb-4"
      />

      {/* Time Display */}
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-6 px-2">
        <span className="font-mono">{formatTime(currentTime)}</span>
        {/* Linear progress bar */}
        <div className="flex-1 mx-4 h-1 bg-border/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-neon-green rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="font-mono">{formatTime(duration)}</span>
      </div>

      {/* Secondary Controls */}
      <div className="flex items-center justify-center gap-3 sm:gap-5 mb-6">
        <button
          onClick={() => seek(Math.max(0, currentTime - 10))}
          className="p-3 text-muted-foreground hover:text-foreground active:scale-95 transition-all focus-ring rounded-xl hover:bg-muted/20 touch-manipulation"
          title="Rewind 10s"
        >
          <SkipBack className="w-5 h-5" />
        </button>

        <button
          onClick={handleFavoriteToggle}
          className={`p-3 transition-all active:scale-95 focus-ring rounded-xl touch-manipulation ${
            isFavorite ? 'text-red-400 hover:text-red-300 bg-red-500/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
          }`}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
        </button>

        <button
          onClick={() => setLoopEnabled(!loopEnabled)}
          className={`p-3 transition-all active:scale-95 focus-ring rounded-xl touch-manipulation ${
            loopEnabled ? 'text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground hover:bg-muted/20'
          }`}
          title="Toggle loop"
        >
          <Repeat className="w-5 h-5" />
        </button>

        <button
          onClick={() => seek(Math.min(duration, currentTime + 10))}
          className="p-3 text-muted-foreground hover:text-foreground active:scale-95 transition-all focus-ring rounded-xl hover:bg-muted/20 touch-manipulation"
          title="Forward 10s"
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      {/* Volume Control */}
      <div className="flex items-center gap-3 mb-6 px-2">
        <button
          onClick={() => setVolume(volume > 0 ? 0 : 0.7)}
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
        >
          {volume === 0 ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
        <div className="flex-1 relative">
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            onTouchStart={() => setIsDragging(true)}
            onTouchEnd={() => setIsDragging(false)}
            className="w-full"
            style={{
              background: `linear-gradient(to right, hsl(217, 91%, 60%) 0%, hsl(217, 91%, 60%) ${volume * 100}%, hsl(220, 13%, 18%) ${volume * 100}%, hsl(220, 13%, 18%) 100%)`
            }}
          />
        </div>
        <span className="text-sm text-muted-foreground font-mono w-10 text-right">
          {Math.round(volume * 100)}%
        </span>
      </div>

      {/* Timer Display */}
      {timerMinutes && remainingTime !== null && (
        <div className="flex items-center justify-center gap-2 mb-6 text-sm bg-primary/5 border border-primary/10 rounded-xl py-2.5 px-4">
          <Timer className="w-4 h-4 text-primary" />
          <span>Timer: {Math.ceil(remainingTime / 1000 / 60)} min remaining</span>
          <button
            onClick={() => setTimer(null)}
            className="text-muted-foreground hover:text-foreground ml-2 p-0.5 rounded hover:bg-muted/30"
          >
            &times;
          </button>
        </div>
      )}

      {/* Keyboard Shortcuts - Desktop */}
      <div className="hidden sm:flex items-center justify-center gap-4 text-xs text-muted-foreground mb-4">
        {[
          { key: 'Space', label: 'Play/Pause' },
          { key: '↑↓', label: 'Volume' },
          { key: '←→', label: 'Seek' },
          { key: 'T', label: 'Settings' },
        ].map(({ key, label }) => (
          <div key={key} className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-muted/50 rounded text-[10px] font-mono border border-border/50">{key}</kbd>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {/* Mobile Gesture Hint */}
      <div className="sm:hidden text-center text-xs text-muted-foreground mb-4 px-4">
        Swipe up/down anywhere to adjust volume
      </div>

      {/* Settings Toggle */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-muted-foreground hover:text-foreground transition-colors focus-ring rounded-xl hover:bg-muted/10 border border-border/50"
      >
        <Settings className="w-4 h-4" />
        <span className="text-sm">Settings</span>
        {showSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {/* Technical Spec Panel */}
      <div className="mt-5 p-4 bg-muted/5 rounded-xl text-sm border border-border/30">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Beat/Core</div>
            <div className="font-mono text-sm">
              {track.beatHz ? `${track.beatHz} Hz` : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Schumann: {track.tags?.some(t => /schumann/i.test(t)) ? 'Yes' : 'No'}
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Processing</div>
            <div className="text-xs space-y-0.5">
              <div>HRV 0.1 Hz: {track.tags?.some(t => /hrv/i.test(t) || /0\.1\s*hz/i.test(t)) ? 'Yes' : 'No'}</div>
              <div>Gamma 40 Hz: {track.tags?.some(t => /gamma\s*40/i.test(t) || /40\s*hz/i.test(t)) ? 'Yes' : 'No'}</div>
              <div>Micro-ITD: {track.tags?.some(t => /microitd|itd|spatial/i.test(t)) ? 'Yes' : 'No'}</div>
              <div>Spindle 13 Hz: {track.tags?.some(t => /spindle|13\s*hz/i.test(t)) ? 'Yes' : 'No'}</div>
              <div>Hemi-alt: {track.tags?.some(t => /hemi|alternator/i.test(t)) ? 'Yes' : 'No'}</div>
            </div>
          </div>
          <div>
            <div className="text-muted-foreground text-xs uppercase tracking-wider mb-1">Delivery</div>
            <div className="text-xs space-y-0.5">
              <div>Codec: Opus/AAC auto</div>
              <div>Gapless: yes</div>
              <div>Duration: {formatTime(track.durationSec)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      {showSettings && (
        <div className="mt-5 p-5 bg-muted/5 rounded-xl space-y-6 border border-border/30">
          {/* Audio Processing */}
          <div>
            <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider">Audio Processing</h4>
            <div className="space-y-3">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={normalizeEnabled}
                  onChange={(e) => setNormalizeEnabled(e.target.checked)}
                  className="rounded border-border"
                />
                <span className="text-sm">Enable loudness normalization</span>
              </label>

              <div>
                <label className="flex items-center justify-between text-sm mb-2">
                  <span>Crossfade Duration</span>
                  <span className="font-mono text-primary">{crossfadeDuration}s</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={crossfadeDuration}
                  onChange={(e) => setCrossfadeDuration(parseInt(e.target.value))}
                  className="w-full"
                  style={{
                    background: `linear-gradient(to right, hsl(217, 91%, 60%) 0%, hsl(217, 91%, 60%) ${crossfadeDuration * 10}%, hsl(220, 13%, 18%) ${crossfadeDuration * 10}%, hsl(220, 13%, 18%) 100%)`
                  }}
                />
              </div>
            </div>
          </div>

          {/* Timer Settings */}
          <div>
            <h4 className="font-semibold mb-3 text-sm uppercase tracking-wider">Timer</h4>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[15, 30, 45, 60].map((minutes) => (
                <button
                  key={minutes}
                  onClick={() => handleTimerSet(minutes)}
                  className={`px-3 py-2.5 text-sm rounded-xl transition-all ${
                    timerMinutes === minutes
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                      : 'bg-muted/30 hover:bg-muted/50 border border-border'
                  }`}
                >
                  {minutes}m
                </button>
              ))}
            </div>
            <div className="flex space-x-2">
              <input
                type="number"
                min="1"
                max="999"
                placeholder="Custom minutes"
                value={customTimerInput}
                onChange={(e) => setCustomTimerInput(e.target.value)}
                className="flex-1 px-3 py-2.5 text-sm bg-background border border-border rounded-xl"
              />
              <button
                onClick={handleCustomTimer}
                className="px-4 py-2.5 text-sm bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-colors"
              >
                Set
              </button>
            </div>
            {timerMinutes && (
              <button
                onClick={() => setTimer(null)}
                className="w-full mt-2 px-3 py-2 text-sm bg-destructive/10 text-destructive rounded-xl hover:bg-destructive/20 transition-colors"
              >
                Clear Timer
              </button>
            )}
          </div>

          {/* Noise Layer */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center gap-2 text-sm uppercase tracking-wider">
              <Waves className="w-4 h-4" />
              <span>Background Noise</span>
            </h4>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {[
                { type: null, label: 'Off' },
                { type: 'pink' as const, label: 'Pink' },
                { type: 'brown' as const, label: 'Brown' },
                { type: 'white' as const, label: 'White' },
              ].map(({ type, label }) => (
                <button
                  key={label}
                  onClick={() => setNoiseType(type)}
                  className={`px-3 py-2.5 text-sm rounded-xl transition-all ${
                    noiseType === type
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                      : 'bg-muted/30 hover:bg-muted/50 border border-border'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {noiseType && (
              <div className="flex items-center gap-3">
                <span className="text-sm">Volume:</span>
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.01"
                  value={noiseVolume}
                  onChange={(e) => setNoiseVolume(parseFloat(e.target.value))}
                  className="flex-1"
                  style={{
                    background: `linear-gradient(to right, hsl(217, 91%, 60%) 0%, hsl(217, 91%, 60%) ${(noiseVolume / 0.5) * 100}%, hsl(220, 13%, 18%) ${(noiseVolume / 0.5) * 100}%, hsl(220, 13%, 18%) 100%)`
                  }}
                />
                <span className="text-sm text-muted-foreground font-mono w-12">
                  {Math.round(noiseVolume * 200)}%
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Science Info */}
      {bandInfo && (
        <div className={`mt-5 p-5 ${bandInfo.bgColor} border ${bandInfo.bgColor.replace('/10', '/20')} rounded-xl`}>
          <h4 className={`font-semibold ${bandInfo.color} mb-2 flex items-center gap-2`}>
            <div className={`w-2 h-2 rounded-full ${bandInfo.color.replace('text-', 'bg-')}`} />
            {bandInfo.name} Waves ({bandInfo.range})
          </h4>
          <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
            {bandInfo.description}
          </p>
          <div className="text-xs text-muted-foreground border-t border-current/5 pt-2 mt-2">
            <strong>Tip:</strong> {bandInfo.tips[0]}
          </div>
          {bandInfo.researchNote && (
            <div className="text-xs text-muted-foreground/70 mt-2 italic">
              {bandInfo.researchNote}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
