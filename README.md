# Synchra

**Tune probability with precision audio.**

A production-ready binaural beats web application built with Next.js 14, featuring build-time audio ingestion, Web Audio API processing, and PWA capabilities.

![Synchra](https://img.shields.io/badge/Next.js-14-black) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![PWA](https://img.shields.io/badge/PWA-Ready-green) ![Vercel](https://img.shields.io/badge/Deploy-Vercel-black)

## Features

### 🎵 Audio Experience
- **Binaural beats** with scientifically-backed frequencies (Delta, Theta, Alpha, Beta, Gamma)
- **Hybrid codec support** - Opus (.webm) and AAC (.m4a) with automatic format selection
- **LUFS normalization** - Consistent loudness at -16 LUFS with optional per-track gain adjustment
- **Crossfade transitions** - Configurable 0-10 second smooth transitions
- **Noise layers** - Pink, brown, and white noise with independent volume control
- **Audio limiting** - Dynamics compression prevents clipping and protects hearing

### 🧠 Science-Backed Design
- **Frequency targeting** - Delta (0.5-4Hz) for sleep, Beta (12-30Hz) for focus, etc.
- **Usage guidance** - Built-in tips and explanations for each brainwave band
- **Session presets** - Deep Focus 45min, Lucid 30min, Calm 10min configurations
- **Timer system** - Gentle fade-out timers for natural session endings

### 🚀 Modern Web Platform
- **Progressive Web App** - Installable, offline-capable, native-like experience
- **Service Worker caching** - Audio files cached for offline playback
- **Responsive design** - Mobile-first with desktop optimization
- **Keyboard shortcuts** - Space (play/pause), arrows (seek/volume), T (timer)
- **Real-time waveform** - Visual feedback with peak analysis

### 📦 Build-Time Ingestion
- **Google Drive integration** - Fetch tracks from public folders or API
- **FFmpeg processing** - Automatic transcoding, normalization, and duration analysis
- **Waveform generation** - 512-sample peaks for progress visualization
- **Metadata inference** - Extract frequency, state, and tags from filenames
- **Idempotent builds** - Only process changed files, clean stale outputs

## Background playback and audio quality

- **Library:** Background playback is enabled by default. Tracks play directly through the browser media player, without an AudioContext in the signal path. Lock-screen play/pause and seeking are provided where supported. Use the phone's hardware volume controls on iOS. Turn Background playback off in Player Settings to use live normalization, crossfading, and the extra noise layer. The original stereo recordings are preserved; this change does not remaster uploaded tracks.
- **Studio:** Background playback streams a 44.1 kHz, 16-bit stereo session from `/api/studio-audio`. Preset ramps, secondary tones, modulation and the selected noise bed are rendered into the sound, so page timers are not needed. Sessions use the preset duration (up to 90 minutes), with 250 ms cosine attack/release and output headroom. This requires connectivity and transfers about 11 MB per minute; prefer Wi-Fi for long sessions. Switching this option off retains local live synthesis.
- **Quality:** Frequency ramps integrate phase continuously, left/right carriers remain separate, output gating is smoothed, and PCM uses deterministic dither. The live synthesizer now fades after modulation, correctly mutes at zero level, cancels stale frequency ramps, and safely handles rapid stop/start. These are audio engineering improvements, not claims of stronger therapeutic effects.

Keep the browser tab open when changing apps or locking the phone. The operating system can still interrupt playback for calls, competing audio, power management, or browser termination. Physical iPhone and Android screen-lock testing remains necessary. JavaScript sleep timers are best-effort in the background; Studio's rendered session endpoint is timed in the audio itself.

Validation: `npm run typecheck`, `npm run lint`, `npm run build`, `npx tsx --test tests/studio-audio.test.ts`, and `npx playwright test playwright/tests/background-audio.spec.ts`. Set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` only when using a system Chromium installation.

## Quick Start

### Prerequisites
- **Node.js** 20+ (for optimal Vercel compatibility)
- **pnpm** package manager
- **FFmpeg** and **FFprobe** on your PATH

#### Install FFmpeg:
```bash
# macOS
brew install ffmpeg

# Ubuntu/Debian
sudo apt-get install ffmpeg

# Windows (via Chocolatey)
choco install ffmpeg

# Or download from https://ffmpeg.org/download.html
```

### Setup

1. **Clone and install:**
   ```bash
   git clone https://github.com/lordbuffcloud/Synchra.git
   cd Synchra
   pnpm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env.local
   ```

   Edit `.env.local`:
   ```env
   NEXT_PUBLIC_APP_NAME=Synchra
   DRIVE_FOLDER_URL=https://drive.google.com/drive/folders/12YWqmzkzRCQJt262YuQ1pajwtk73PND3
   # Optional: comma-separated file IDs if not using folder URL
   DRIVE_FILE_IDS=
   # Optional: API key for private folders
   GOOGLE_API_KEY=
   ```

3. **Development:**
   ```bash
   # Fetch and process tracks (runs automatically during install)
   pnpm run prepare
   
   # Start development server
   pnpm dev
   ```

4. **Production build:**
   ```bash
   pnpm build
   ```

5. **Test:**
   ```bash
   pnpm test      # Playwright tests
   pnpm lint      # ESLint
   pnpm typecheck # TypeScript
   ```

## Deployment

### Vercel (Recommended)

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "feat: initial Synchra setup"
   git push origin main
   ```

2. **Import to Vercel:**
   - Visit [vercel.com](https://vercel.com)
   - Import `https://github.com/lordbuffcloud/Synchra`
   - Set environment variables:
     - `NEXT_PUBLIC_APP_NAME=Synchra`
     - `DRIVE_FOLDER_URL=your_folder_url`
     - `GOOGLE_API_KEY=your_key` (if needed)

3. **Build settings** (auto-detected):
   - **Install:** `pnpm install`
   - **Build:** `pnpm build`
   - **Output:** `.next`
   - **Node:** 20.x

### Manual Deployment

```bash
# Build with all optimizations
pnpm build

# Serve statically (requires server with Node.js support)
pnpm start
```

## Architecture

### Directory Structure
```
├── app/                    # Next.js 14 App Router
│   ├── page.tsx           # Home page with track grid
│   ├── player/[id]/       # Dynamic player routes
│   ├── library/           # Full library view
│   └── about/             # Science documentation
├── components/            # React components
│   ├── Player.tsx         # Main audio player
│   ├── TrackCard.tsx      # Track preview cards
│   └── Header.tsx         # Navigation
├── content/               # Static content
│   └── binauralScience.ts # Brainwave band information
├── scripts/               # Build-time processing
│   ├── fetch_tracks.ts    # Google Drive ingestion
│   └── postbuild.ts       # Build verification
├── store/                 # State management
│   └── usePlayer.ts       # Zustand player store
├── types/                 # TypeScript definitions
├── utils/                 # Utilities
│   ├── audioGraph.ts      # Web Audio API wrapper
│   └── manifest.ts        # Track loading utilities
└── public/
    ├── manifest.webmanifest # PWA configuration
    ├── sw.js               # Service worker
    └── tracks/             # Generated audio files
        ├── tracks.json     # Track manifest
        └── *.webm, *.m4a   # Processed audio
```

### Audio Processing Pipeline

1. **Ingestion** (`scripts/fetch_tracks.ts`)
   - Download from Google Drive (public folder scraping or API)
   - Cache with ETag validation for incremental updates
   - Support for .wav, .mp3, .flac, .m4a input formats

2. **Transcoding** (FFmpeg)
   ```bash
   # Opus encoding (preferred)
   ffmpeg -i input.wav -c:a libopus -b:a 128k -af "loudnorm=I=-16:LRA=11:TP=-1.5" output.webm
   
   # AAC fallback
   ffmpeg -i input.wav -c:a aac -b:a 192k -af "loudnorm=I=-16:LRA=11:TP=-1.5" output.m4a
   ```

3. **Analysis**
   - Duration extraction with ffprobe
   - Integrated loudness measurement (LUFS)
   - 512-sample waveform generation
   - Metadata inference from filenames

4. **Manifest Generation**
   ```json
   {
     "tracks": [
       {
         "id": "track_id",
         "title": "Alpha 10Hz Focus",
         "filenameWebm": "alpha_10hz_focus.webm",
         "filenameAac": "alpha_10hz_focus.m4a",
         "durationSec": 1800,
         "targetState": "Focus",
         "beatHz": 10,
         "gainDb": -2.3,
         "peaksPath": "peaks/alpha_10hz_focus.json"
       }
     ]
   }
   ```

### Player Implementation

The Web Audio API implementation provides:
- **Crossfade Node** - Smooth A/B channel transitions
- **Dynamics Compression** - Limiting at -6dB threshold with 12:1 ratio
- **Noise Generation** - Real-time pink/brown/white noise synthesis
- **Format Selection** - Opus preferred, AAC fallback based on browser support
- **Gapless Playback** - Buffer preloading and seamless loops

### PWA Features

- **App Manifest** - Installable with custom icons and shortcuts
- **Service Worker** - Aggressive audio caching with offline fallbacks
- **Cache Strategy** - Network-first for HTML, cache-first for audio
- **Background Sync** - Automatic manifest updates when online
- **Offline UI** - Graceful degradation with offline indicators

## Track Naming Convention

Filenames are parsed to extract metadata:

```
delta_2hz_deep_sleep.wav     → Delta (2Hz), Deep Sleep state
theta-6.5hz-meditation.mp3   → Theta (6.5Hz), Lucid state  
alpha_10hz_focus_session.flac → Alpha (10Hz), Focus state
beta_20hz_concentration.m4a  → Beta (20Hz), Focus state
gamma-40hz-insight.wav       → Gamma (40Hz), Focus state
```

Pattern: `{band}_{frequency}hz_{description}.{ext}`
- **Band detection**: Delta/Theta/Alpha/Beta/Gamma keywords
- **Frequency extraction**: Decimal numbers followed by "hz"
- **State mapping**: Keywords like "sleep", "focus", "calm", "meditation"
- **Tag generation**: Additional keywords become searchable tags

## Browser Support

### Audio Formats
- **Opus (preferred)**: Chrome 25+, Firefox 15+, Edge 14+
- **AAC (fallback)**: All major browsers including Safari

### Web APIs
- **Web Audio API**: Chrome 14+, Firefox 25+, Safari 14+
- **Service Workers**: Chrome 45+, Firefox 44+, Safari 11.1+
- **PWA Features**: Chrome 57+, Edge 79+, Safari 11.3+

### Mobile Optimization
- **iOS**: Safari 11.3+ with Web Audio unlock on user gesture
- **Android**: Chrome Mobile with optimized buffer sizes
- **Touch controls**: Responsive design with gesture-friendly UI

## Performance

### Bundle Size
- **Initial load**: ~150KB gzipped (Next.js optimized)
- **Audio player**: ~50KB additional (Web Audio utilities)
- **Icons & fonts**: ~20KB (optimized Google Fonts)

### Audio Caching
- **Service Worker**: Persistent audio caching up to browser limits
- **Compression**: Opus at 128kbps (~1MB per 10-minute track)
- **Incremental loading**: Only changed tracks downloaded

### Build Optimization
- **Static generation**: Pre-rendered pages with ISR support
- **Image optimization**: Next.js automatic WebP conversion
- **Code splitting**: Dynamic imports for non-critical features

## Contributing

### Development Setup
1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Make changes and test: `pnpm test`
4. Commit: `git commit -m "feat: add amazing feature"`
5. Push: `git push origin feature/amazing-feature`
6. Open pull request

### Code Standards
- **ESLint**: Airbnb config with Next.js rules
- **TypeScript**: Strict mode with explicit return types
- **Prettier**: 2-space indentation, single quotes, no semicolons
- **Commits**: Conventional commits (feat/fix/docs/style/refactor)

## Troubleshooting

### Track Ingestion Issues
```bash
# Check FFmpeg installation
ffmpeg -version
ffprobe -version

# Test Google Drive access
curl "https://drive.google.com/drive/folders/YOUR_FOLDER_ID"

# Manual track ingestion
pnpm tsx scripts/fetch_tracks.ts

# Build without tracks (fallback)
mkdir -p public/tracks
echo '{"tracks":[],"lastUpdated":"'$(date -Iseconds)'","totalTracks":0}' > public/tracks/tracks.json
pnpm build
```

### PWA Installation Issues
```bash
# Check manifest
curl localhost:3000/manifest.webmanifest

# Test service worker
# Open DevTools → Application → Service Workers

# Clear cache
# DevTools → Application → Storage → Clear site data
```

### Audio Playback Issues
- **iOS Safari**: Requires user gesture before audio context creation
- **Autoplay policies**: Player initializes on first user interaction
- **Format support**: Check browser compatibility in DevTools console
- **CORS errors**: Ensure audio files served from same origin

### Build Failures
```bash
# Clear Next.js cache
rm -rf .next

# Clear node modules and reinstall
rm -rf node_modules pnpm-lock.yaml
pnpm install

# Check TypeScript
pnpm typecheck

# Verify tracks exist
ls -la public/tracks/
```

## License

MIT © [Your Name](https://github.com/lordbuffcloud)

---

**Ready to tune your probability?** Deploy Synchra and experience precision audio for the modern mind.

```bash
# One-command deploy refresh
pnpm refresh:tracks && git push && vercel --prod
```

For support, issues, or feature requests, visit [GitHub Issues](https://github.com/lordbuffcloud/Synchra/issues).