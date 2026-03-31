'use client'

/**
 * WaveformBackground -- layered sine-wave SVG animation rendered behind the
 * hero section.  Pure CSS keyframes drive the motion so there is zero JS
 * overhead at runtime.  Respects `prefers-reduced-motion`.
 */
export default function WaveformBackground() {
  // Each wave: d path, color, opacity, animation duration, animation delay
  const waves = [
    {
      // Low-frequency sine -- cyan
      d: 'M0,50 C100,20 200,80 300,50 C400,20 500,80 600,50 C700,20 800,80 900,50 C1000,20 1100,80 1200,50 C1300,20 1400,80 1500,50 C1600,20 1700,80 1800,50',
      color: '#00d4ff',
      opacity: 0.06,
      duration: '18s',
      delay: '0s',
    },
    {
      // Mid-frequency sine -- purple
      d: 'M0,50 C60,25 120,75 180,50 C240,25 300,75 360,50 C420,25 480,75 540,50 C600,25 660,75 720,50 C780,25 840,75 900,50 C960,25 1020,75 1080,50 C1140,25 1200,75 1260,50 C1320,25 1380,75 1440,50 C1500,25 1560,75 1620,50 C1680,25 1740,75 1800,50',
      color: '#b347d9',
      opacity: 0.05,
      duration: '14s',
      delay: '-4s',
    },
    {
      // Higher-frequency sine -- green
      d: 'M0,50 C40,30 80,70 120,50 C160,30 200,70 240,50 C280,30 320,70 360,50 C400,30 440,70 480,50 C520,30 560,70 600,50 C640,30 680,70 720,50 C760,30 800,70 840,50 C880,30 920,70 960,50 C1000,30 1040,70 1080,50 C1120,30 1160,70 1200,50 C1240,30 1280,70 1320,50 C1360,30 1400,70 1440,50 C1480,30 1520,70 1560,50 C1600,30 1640,70 1680,50 C1720,30 1760,70 1800,50',
      color: '#39ff14',
      opacity: 0.04,
      duration: '22s',
      delay: '-8s',
    },
    {
      // Very low -- cyan secondary
      d: 'M0,50 C150,15 300,85 450,50 C600,15 750,85 900,50 C1050,15 1200,85 1350,50 C1500,15 1650,85 1800,50',
      color: '#00d4ff',
      opacity: 0.03,
      duration: '26s',
      delay: '-2s',
    },
  ]

  return (
    <div
      className="absolute inset-0 overflow-hidden pointer-events-none waveform-container"
      aria-hidden="true"
    >
      {waves.map((wave, i) => (
        <svg
          key={i}
          className="absolute top-0 left-0 h-full waveform-wave"
          style={{
            width: '200%',
            animationDuration: wave.duration,
            animationDelay: wave.delay,
          }}
          viewBox="0 0 1800 100"
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d={wave.d}
            stroke={wave.color}
            strokeWidth="1.5"
            strokeOpacity={wave.opacity}
            fill="none"
          />
        </svg>
      ))}
    </div>
  )
}
