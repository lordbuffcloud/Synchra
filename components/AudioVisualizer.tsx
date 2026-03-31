'use client'

interface AudioVisualizerProps {
  isPlaying: boolean
  bandColor?: string
  barCount?: number
  className?: string
}

export default function AudioVisualizer({
  isPlaying,
  bandColor = '#3b82f6',
  barCount = 40,
  className = '',
}: AudioVisualizerProps) {
  return (
    <div
      className={`flex items-end justify-center gap-[2px] ${className}`}
      style={{ height: 40 }}
      aria-hidden="true"
    >
      {Array.from({ length: barCount }, (_, i) => {
        // Stagger the animation delay using a sin-based pattern so
        // neighbouring bars don't peak at the same time.
        const phase = (i / barCount) * Math.PI * 2
        const delay = (Math.sin(phase) * 0.5 + 0.5) * 1.2 // 0 – 1.2 s
        // Vary duration slightly per bar for a more organic feel
        const duration = 1.0 + (Math.cos(phase * 1.7) * 0.4) // 0.6 – 1.4 s

        return (
          <div
            key={i}
            className={`visualizer-bar rounded-full ${isPlaying ? 'playing' : ''}`}
            style={{
              width: 3,
              height: '100%',
              backgroundColor: bandColor,
              opacity: isPlaying ? 0.8 : 0.25,
              animationDelay: isPlaying ? `${delay}s` : undefined,
              animationDuration: isPlaying ? `${duration}s` : undefined,
              transform: isPlaying ? undefined : 'scaleY(0.15)',
              transition: 'opacity 0.4s ease, transform 0.4s ease',
            }}
          />
        )
      })}
    </div>
  )
}
