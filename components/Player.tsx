'use client'

import { useEffect, useMemo, useState } from 'react'
import { Play, Pause, SkipBack, SkipForward, Volume2, Heart, Repeat, Timer, Settings, Waves } from 'lucide-react'
import usePlayer from '@/store/usePlayer'
import { Track } from '@/types/track'
import { brainwaveBands, getBandByFrequency } from '@/content/binauralScience'

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
  className = '',
}: {
  progress: number
  peaks?: number[]
  size?: number
  className?: string
}) {
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const strokeDasharray = circumference
  const strokeDashoffset = circumference - (progress / 100) * circumference

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
          className="text-border"
        />
        
        {/* Waveform visualization */}
        {peaks && (
          <g className="opacity-30">
            {peaks.slice(0, 64).map((peak, i) => {
              const angle = (i / 64) * 2 * Math.PI
              const x1 = size / 2 + (radius - 20) * Math.cos(angle)
              const y1 = size / 2 + (radius - 20) * Math.sin(angle)
              const peakHeight = Math.abs(peak) * 0.3 + 2
              const x2 = size / 2 + (radius - 20 + peakHeight) * Math.cos(angle)
              const y2 = size / 2 + (radius - 20 + peakHeight) * Math.sin(angle)
              
              return (
                <line
                  key={i}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-neon-blue"
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
          stroke="url(#neon-gradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300"
        />
        
        {/* Gradient definition */}
        <defs>
          <linearGradient id="neon-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00d4ff" />
            <stop offset="50%" stopColor="#b347d9" />
            <stop offset="100%" stopColor="#39ff14" />
          </linearGradient>
        </defs>
      </svg>

      {/* Center content */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="text-3xl font-bold font-mono">
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

  const ringSize = useMemo(() => 240, [])

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
      
      // Volume control via vertical swipe (minimum 50px movement)
      if (Math.abs(deltaY) > 50) {
        e.preventDefault()
        const volumeChange = deltaY / 200 // Sensitivity adjustment
        const newVolume = Math.max(0, Math.min(1, volume + volumeChange))
        setVolume(newVolume)
        setTouchStartY(touchY) // Update for continuous swiping
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
      if (currentTrack?.id !== track.id) {
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
    if (minutes && !timerStartTime && isPlaying) {
      // Timer will be handled by the store
    }
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

  const band = track?.beatHz ? getBandByFrequency(track.beatHz) : null
  const bandInfo = band ? brainwaveBands[band] : null

  if (!track) {
    return (
      <div className={`flex items-center justify-center min-h-[400px] text-center ${className}`}>
        <div>
          <div className="text-6xl mb-4">🎵</div>
          <h3 className="text-xl font-semibold mb-2">No track selected</h3>
          <p className="text-muted-foreground">Choose a track to start listening</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`player-container bg-card rounded-xl p-4 sm:p-8 ${className} select-none`}>
      {/* Track Info */}
      <div className="text-center mb-6 sm:mb-8">
        <h2 className="text-xl sm:text-2xl font-bold mb-2 leading-tight px-2">{track.title}</h2>
        <p className="text-muted-foreground mb-2 text-sm sm:text-base px-2 line-clamp-2">{track.description}</p>
        
        {track.beatHz && (
          <div className="flex items-center justify-center flex-wrap gap-2 text-sm px-2">
            <span className="px-3 py-1 bg-primary/10 text-primary rounded-full font-mono text-xs sm:text-sm">
              {track.beatHz}Hz
            </span>
            {band && (
              <span className="px-3 py-1 bg-muted/50 rounded-full capitalize text-xs sm:text-sm">
                {band} waves
              </span>
            )}
            <span className="px-3 py-1 bg-accent/10 text-accent rounded-full text-xs sm:text-sm">
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
            className="w-[200px] h-[200px] sm:w-[240px] sm:h-[240px]"
          />
          
          {/* Seekable overlay (behind the play button) */}
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
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-primary hover:bg-primary/90 active:scale-95 rounded-full flex items-center justify-center transition-all micro-motion disabled:opacity-50">
              {isLoading ? (
                <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-6 h-6 sm:w-8 sm:h-8 text-primary-foreground" fill="currentColor" />
              ) : (
                <Play className="w-6 h-6 sm:w-8 sm:h-8 text-primary-foreground ml-0.5 sm:ml-1" fill="currentColor" />
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Time Display */}
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-6">
        <span className="font-mono">{formatTime(currentTime)}</span>
        <span className="font-mono">{formatTime(duration)}</span>
      </div>

      {/* Secondary Controls */}
      <div className="flex items-center justify-center space-x-4 sm:space-x-6 mb-6">
        <button
          onClick={() => seek(Math.max(0, currentTime - 10))}
          className="p-3 sm:p-2 text-muted-foreground hover:text-foreground active:scale-95 transition-all focus-ring rounded-lg touch-manipulation"
          title="Rewind 10s"
        >
          <SkipBack className="w-5 h-5" />
        </button>

        <button
          onClick={handleFavoriteToggle}
          className={`p-3 sm:p-2 transition-all active:scale-95 focus-ring rounded-lg touch-manipulation ${
            isFavorite ? 'text-red-400 hover:text-red-300' : 'text-muted-foreground hover:text-foreground'
          }`}
          title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
        >
          <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
        </button>

        <button
          onClick={() => setLoopEnabled(!loopEnabled)}
          className={`p-3 sm:p-2 transition-all active:scale-95 focus-ring rounded-lg touch-manipulation ${
            loopEnabled ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
          }`}
          title="Toggle loop"
        >
          <Repeat className="w-5 h-5" />
        </button>

        <button
          onClick={() => seek(Math.min(duration, currentTime + 10))}
          className="p-3 sm:p-2 text-muted-foreground hover:text-foreground active:scale-95 transition-all focus-ring rounded-lg touch-manipulation"
          title="Forward 10s"
        >
          <SkipForward className="w-5 h-5" />
        </button>
      </div>

      {/* Volume Control */}
      <div className="flex items-center space-x-3 sm:space-x-4 mb-6 px-2">
        <Volume2 className="w-5 h-5 text-muted-foreground flex-shrink-0" />
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
            className="w-full h-8 sm:h-6 appearance-none bg-muted rounded-lg cursor-pointer"
            style={{
              background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${volume * 100}%, hsl(var(--muted)) ${volume * 100}%, hsl(var(--muted)) 100%)`
            }}
          />
        </div>
        <span className="text-sm text-muted-foreground font-mono w-10 sm:w-12 text-right">
          {Math.round(volume * 100)}%
        </span>
      </div>

      {/* Timer Display */}
      {timerMinutes && remainingTime !== null && (
        <div className="flex items-center justify-center space-x-2 mb-6 text-sm">
          <Timer className="w-4 h-4 text-primary" />
          <span>Timer: {Math.ceil(remainingTime / 1000 / 60)} min remaining</span>
          <button
            onClick={() => setTimer(null)}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>
      )}

      {/* Keyboard Shortcuts Help - Hidden on mobile */}
      <div className="hidden sm:flex items-center justify-center space-x-4 text-xs text-muted-foreground mb-4">
        <div className="flex items-center space-x-1">
          <kbd className="px-2 py-1 bg-muted rounded text-xs">Space</kbd>
          <span>Play/Pause</span>
        </div>
        <div className="flex items-center space-x-1">
          <kbd className="px-2 py-1 bg-muted rounded text-xs">↑↓</kbd>
          <span>Volume</span>
        </div>
        <div className="flex items-center space-x-1">
          <kbd className="px-2 py-1 bg-muted rounded text-xs">←→</kbd>
          <span>Seek</span>
        </div>
        <div className="flex items-center space-x-1">
          <kbd className="px-2 py-1 bg-muted rounded text-xs">T</kbd>
          <span>Settings</span>
        </div>
      </div>
      
      {/* Mobile Gesture Hint */}
      <div className="sm:hidden text-center text-xs text-muted-foreground mb-4 px-4">
        <span>👆 Swipe up/down anywhere to adjust volume</span>
      </div>

      {/* Settings Toggle */}
      <div className="flex items-center justify-center">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center space-x-2 px-4 py-2 text-muted-foreground hover:text-foreground transition-colors focus-ring rounded-lg"
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </button>
      </div>

      {/* Spec Panel */}
      <div className="mt-6 p-4 bg-muted/10 rounded-lg text-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <div className="text-muted-foreground">Beat/Core</div>
            <div className="font-mono">
              {track.beatHz ? `${track.beatHz} Hz` : '—'}
            </div>
            <div className="text-xs text-muted-foreground">Schumann option: {track.tags?.some(t => /schumann/i.test(t)) ? 'Yes' : 'No'}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Processing</div>
            <div className="text-xs space-y-1">
              <div>HRV 0.1 Hz: {track.tags?.some(t => /hrv/i.test(t) || /0\.1\s*hz/i.test(t)) ? 'Yes' : 'No'}</div>
              <div>Gamma 40 Hz: {track.tags?.some(t => /gamma\s*40/i.test(t) || /40\s*hz/i.test(t)) ? 'Yes' : 'No'}</div>
              <div>Micro-ITD drift: {track.tags?.some(t => /microitd|itd|spatial/i.test(t)) ? 'Yes' : 'No'}</div>
              <div>Stochastic dither: {track.tags?.some(t => /dither|white\s*noise/i.test(t)) ? 'Yes' : 'No'}</div>
              <div>Spindle 13 Hz: {track.tags?.some(t => /spindle|13\s*hz/i.test(t)) ? 'Yes' : 'No'}</div>
              <div>Hemi-alternator: {track.tags?.some(t => /hemi|alternator/i.test(t)) ? 'Yes' : 'No'}</div>
            </div>
          </div>
          <div>
            <div className="text-muted-foreground">Delivery</div>
            <div className="text-xs space-y-1">
              <div>Opus/AAC: auto</div>
              <div>Gapless: yes</div>
              <div>Streaming: byte-range</div>
              <div>Duration: {formatTime(track.durationSec)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Advanced Settings */}
      {showSettings && (
        <div className="mt-6 p-6 bg-muted/20 rounded-lg space-y-6">
          {/* Audio Processing */}
          <div>
            <h4 className="font-semibold mb-3">Audio Processing</h4>
            <div className="space-y-3">
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={normalizeEnabled}
                  onChange={(e) => setNormalizeEnabled(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Enable loudness normalization</span>
              </label>
              
              <div>
                <label className="block text-sm mb-2">
                  Crossfade Duration: {crossfadeDuration}s
                </label>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="1"
                  value={crossfadeDuration}
                  onChange={(e) => setCrossfadeDuration(parseInt(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0s</span>
                  <span>10s</span>
                </div>
              </div>
            </div>
          </div>

          {/* Timer Settings */}
          <div>
            <h4 className="font-semibold mb-3">Timer</h4>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[15, 30, 45, 60].map((minutes) => (
                <button
                  key={minutes}
                  onClick={() => handleTimerSet(minutes)}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    timerMinutes === minutes
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
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
                className="flex-1 px-3 py-2 text-sm bg-background border border-border rounded-lg"
              />
              <button
                onClick={handleCustomTimer}
                className="px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Set
              </button>
            </div>
            {timerMinutes && (
              <button
                onClick={() => setTimer(null)}
                className="w-full mt-2 px-3 py-2 text-sm bg-destructive/10 text-destructive rounded-lg hover:bg-destructive/20 transition-colors"
              >
                Clear Timer
              </button>
            )}
          </div>

          {/* Noise Layer */}
          <div>
            <h4 className="font-semibold mb-3 flex items-center space-x-2">
              <Waves className="w-4 h-4" />
              <span>Background Noise</span>
            </h4>
            <div className="grid grid-cols-2 gap-2 mb-3">
              {[
                { type: null, label: 'Off' },
                { type: 'pink' as const, label: 'Pink' },
                { type: 'brown' as const, label: 'Brown' },
                { type: 'white' as const, label: 'White' },
              ].map(({ type, label }) => (
                <button
                  key={label}
                  onClick={() => setNoiseType(type)}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    noiseType === type
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {noiseType && (
              <div className="flex items-center space-x-3">
                <span className="text-sm">Volume:</span>
                <input
                  type="range"
                  min="0"
                  max="0.5"
                  step="0.01"
                  value={noiseVolume}
                  onChange={(e) => setNoiseVolume(parseFloat(e.target.value))}
                  className="flex-1"
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
        <div className="mt-6 p-4 bg-primary/5 border border-primary/10 rounded-lg">
          <h4 className="font-semibold text-primary mb-2">
            {bandInfo.name} Waves ({bandInfo.range})
          </h4>
          <p className="text-sm text-muted-foreground mb-3">
            {bandInfo.description}
          </p>
          <div className="text-xs text-muted-foreground">
            <strong>Pro tip:</strong> {bandInfo.tips[0]}
          </div>
        </div>
      )}
    </div>
  )
}