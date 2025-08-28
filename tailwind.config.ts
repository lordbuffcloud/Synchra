import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0b0d10',
        foreground: '#ffffff',
        card: '#1a1d23',
        'card-foreground': '#ffffff',
        popover: '#1a1d23',
        'popover-foreground': '#ffffff',
        primary: '#3b82f6',
        'primary-foreground': '#ffffff',
        secondary: '#374151',
        'secondary-foreground': '#ffffff',
        muted: '#374151',
        'muted-foreground': '#9ca3af',
        accent: '#4f46e5',
        'accent-foreground': '#ffffff',
        destructive: '#ef4444',
        'destructive-foreground': '#ffffff',
        border: '#374151',
        input: '#374151',
        ring: '#3b82f6',
        neon: {
          blue: '#00d4ff',
          purple: '#b347d9',
          green: '#39ff14',
          pink: '#ff1493',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['IBM Plex Mono', 'Consolas', 'monospace'],
      },
      backgroundImage: {
        'neon-gradient': 'linear-gradient(45deg, #00d4ff, #b347d9, #39ff14)',
        'neon-gradient-subtle': 'linear-gradient(45deg, rgba(0,212,255,0.1), rgba(179,71,217,0.1), rgba(57,255,20,0.1))',
      },
      keyframes: {
        'micro-bounce': {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'micro-bounce': 'micro-bounce 0.12s ease-in-out',
        'fade-in': 'fade-in 0.12s ease-out',
      },
      borderRadius: {
        lg: '0.5rem',
        md: '0.375rem',
        sm: '0.25rem',
      },
      boxShadow: {
        'neon-sm': '0 0 10px rgba(0,212,255,0.3)',
        'neon-md': '0 0 20px rgba(0,212,255,0.4)',
        'neon-lg': '0 0 30px rgba(0,212,255,0.5)',
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}

export default config