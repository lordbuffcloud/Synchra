import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { Track } from '@/types/track'
import { AudioGraph, NoiseGenerator } from '@/utils/audioGraph'

export interface PlayerState {
  // Current playback state
  currentTrack: Track | null
  isPlaying: boolean
  isLoading: boolean
  currentTime: number
  duration: number
  volume: number
  
  // Player features
  crossfadeDuration: number // 0, 3, 6, 10 seconds
  normalizeEnabled: boolean
  loopEnabled: boolean
  
  // Timer
  timerMinutes: number | null
  timerStartTime: number | null
  timerTimeoutId: number | null
  
  // Noise layer
  noiseType: 'pink' | 'brown' | 'white' | null
  noiseVolume: number
  
  // History and favorites
  recentTracks: string[] // track IDs
  favoriteTracks: string[] // track IDs
  
  // Audio system
  audioGraph: AudioGraph | null
  noiseGenerator: NoiseGenerator | null
  noiseBus: GainNode | null
  noiseAmLfo?: OscillatorNode | null
  noiseAmGain?: GainNode | null
  currentSource: AudioBufferSourceNode | null
  // Streaming media elements for byte-range playback
  mediaA: HTMLAudioElement | null
  mediaB: HTMLAudioElement | null
  mediaGainA: GainNode | null
  mediaGainB: GainNode | null
  activeMediaSlot: 'A' | 'B' | null
  rafId?: number | null
  
  // Session tracking
  sessionStartTime: number | null
  
  // Actions
  initializeAudio: () => Promise<void>
  loadTrack: (track: Track) => Promise<void>
  play: () => Promise<void>
  pause: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  setCrossfadeDuration: (duration: number) => void
  setNormalizeEnabled: (enabled: boolean) => void
  setLoopEnabled: (enabled: boolean) => void
  setTimer: (minutes: number | null) => void
  setNoiseType: (type: 'pink' | 'brown' | 'white' | null) => void
  setNoiseVolume: (volume: number) => void
  addToFavorites: (trackId: string) => void
  removeFromFavorites: (trackId: string) => void
  addToRecent: (trackId: string) => void
  trackSession: (trackId: string, startTime: number, endTime: number, targetState: string, beatHz?: number) => void
  reset: () => void
}

const usePlayer = create<PlayerState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentTrack: null,
      isPlaying: false,
      isLoading: false,
      currentTime: 0,
      duration: 0,
      volume: 0.7,
      crossfadeDuration: 3,
      normalizeEnabled: true,
      loopEnabled: false,
      timerMinutes: null,
      timerStartTime: null,
      timerTimeoutId: null,
      noiseType: null,
      noiseVolume: 0.2,
      recentTracks: [],
      favoriteTracks: [],
      audioGraph: null,
      noiseGenerator: null,
      noiseBus: null,
      noiseAmLfo: null,
      noiseAmGain: null,
      currentSource: null,
      mediaA: null,
      mediaB: null,
      mediaGainA: null,
      mediaGainB: null,
      activeMediaSlot: null,
      rafId: null,
      sessionStartTime: null,

      initializeAudio: async () => {
        const { audioGraph } = get()
        if (audioGraph) return

        try {
          const graph = new AudioGraph()
          const noiseGen = new NoiseGenerator(graph.getContext())

          // Noise bus enables future modulation without affecting the main program material.
          const noiseBus = graph.getContext().createGain()
          noiseBus.gain.value = 1
          noiseBus.connect(graph.getMasterGain())
          noiseGen.connect(noiseBus)

          // Create two persistent media elements and connect to crossfader inputs
          const mediaA = new Audio()
          const mediaB = new Audio()
          mediaA.preload = 'auto'
          mediaB.preload = 'auto'
          mediaA.crossOrigin = 'anonymous'
          mediaB.crossOrigin = 'anonymous'

          const sourceA = graph.createMediaElementSource(mediaA)
          const sourceB = graph.createMediaElementSource(mediaB)

          // Per-slot gain enables track-level normalization (LUFS adjustment).
          const mediaGainA = graph.getContext().createGain()
          const mediaGainB = graph.getContext().createGain()
          mediaGainA.gain.value = 1
          mediaGainB.gain.value = 1

          sourceA.connect(mediaGainA)
          sourceB.connect(mediaGainB)
          mediaGainA.connect(graph.getCrossfader().getInputA())
          mediaGainB.connect(graph.getCrossfader().getInputB())

          set({
            audioGraph: graph,
            noiseGenerator: noiseGen,
            noiseBus,
            mediaA,
            mediaB,
            mediaGainA,
            mediaGainB,
            activeMediaSlot: null,
          })
        } catch (error) {
          console.error('Failed to initialize audio:', error)
        }
      },

      loadTrack: async (track: Track) => {
        let { audioGraph } = get()
        if (!audioGraph) {
          await get().initializeAudio()
          audioGraph = get().audioGraph
        }

        if (!audioGraph) {
          throw new Error('AudioContext failed to initialize')
        }

        set({ isLoading: true, currentTrack: track })

        try {
          await audioGraph.resume()

          // Determine codec
          const supportsOpus = 'MediaSource' in window && MediaSource.isTypeSupported('audio/webm; codecs="opus"')
          const trackUrl = supportsOpus
            ? (track.remoteWebmUrl || `/tracks/${track.filenameWebm}`)
            : (track.remoteAacUrl || `/tracks/${track.filenameAac}`)

          const { mediaA, mediaB, activeMediaSlot, isPlaying, crossfadeDuration } = get()
          if (!mediaA || !mediaB) {
            throw new Error('Media elements not initialized')
          }

          // Choose target slot: if none active yet, use A; otherwise use inactive for crossfade
          const targetSlot: 'A' | 'B' = activeMediaSlot === 'A' ? 'B' : 'A'
          const targetEl = targetSlot === 'A' ? mediaA : mediaB
          const activeEl = activeMediaSlot === 'A' ? mediaA : mediaB

          // Load new source into target slot
          await new Promise<void>((resolve, reject) => {
            targetEl.onloadedmetadata = () => resolve()
            targetEl.onerror = () => reject(new Error('Failed to load media'))
            targetEl.src = trackUrl
            targetEl.load()
          })

          // Update duration from the newly loaded media
          set({ duration: targetEl.duration || track.durationSec, isLoading: false })

          // Apply LUFS normalization (track-level gain) if enabled and metadata is present.
          const { normalizeEnabled, mediaGainA, mediaGainB } = get()
          const gainDb = normalizeEnabled ? (track.gainDb || 0) : 0
          const linearGain = gainDb ? Math.pow(10, gainDb / 20) : 1
          const now = audioGraph!.getContext().currentTime
          const targetGain = targetSlot === 'A' ? mediaGainA : mediaGainB
          if (targetGain) {
            targetGain.gain.setTargetAtTime(linearGain, now, 0.05)
          }

          if (!activeMediaSlot) {
            // First load: set active slot but do not auto-play
            set({ activeMediaSlot: targetSlot })
          } else if (isPlaying) {
            // Crossfade to new track while playing
            targetEl.currentTime = 0
            targetEl.loop = !!get().loopEnabled
            await targetEl.play()
            await audioGraph!.getCrossfader().crossfade(crossfadeDuration)
            if (activeEl) activeEl.pause()
            set({ activeMediaSlot: targetSlot })
          } else {
            // Not playing: switch active slot to target for next play
            set({ activeMediaSlot: targetSlot })
          }

          // Add to recent tracks
          get().addToRecent(track.id)

        } catch (error) {
          console.error('Failed to load track:', error)
          set({ isLoading: false })
          throw error
        }
      },

      play: async () => {
        const { currentTrack, audioGraph, loopEnabled, timerMinutes, mediaA, mediaB, activeMediaSlot } = get()
        if (!currentTrack || !audioGraph || !mediaA || !mediaB || !activeMediaSlot) return

        await audioGraph.resume()

        const active = activeMediaSlot === 'A' ? mediaA : mediaB
        active.loop = !!loopEnabled
        await active.play()
        
        // Start session tracking
        const sessionStart = Date.now()
        set({ isPlaying: true, sessionStartTime: sessionStart })

        if (timerMinutes && !get().timerStartTime) {
          const timeoutId = window.setTimeout(() => {
            get().pause()
            set({ timerStartTime: null, timerTimeoutId: null })
          }, timerMinutes * 60 * 1000)
          set({ timerStartTime: Date.now(), timerTimeoutId: timeoutId })
        }

        const step = () => {
          const { isPlaying } = get()
          if (!isPlaying) return
          set({ currentTime: active.currentTime })
          const rafId = requestAnimationFrame(step)
          set({ rafId })
        }
        step()
      },

      pause: () => {
        const { mediaA, mediaB, rafId, sessionStartTime, currentTrack, timerTimeoutId } = get()
        if (rafId) cancelAnimationFrame(rafId)
        if (mediaA) mediaA.pause()
        if (mediaB) mediaB.pause()

        if (timerTimeoutId) {
          window.clearTimeout(timerTimeoutId)
        }
        
        // Track session if it was long enough (>30 seconds)
        if (sessionStartTime && currentTrack) {
          const sessionEnd = Date.now()
          const duration = (sessionEnd - sessionStartTime) / 1000
          if (duration > 30) {
            get().trackSession(
              currentTrack.id,
              sessionStartTime,
              sessionEnd,
              currentTrack.targetState,
              currentTrack.beatHz
            )
          }
        }
        
        set({ isPlaying: false, rafId: null, sessionStartTime: null, timerTimeoutId: null })
      },

      seek: (time: number) => {
        const { mediaA, mediaB, activeMediaSlot } = get()
        const active = activeMediaSlot === 'A' ? mediaA : mediaB
        if (active) {
          active.currentTime = Math.max(0, Math.min(time, active.duration || Infinity))
          set({ currentTime: active.currentTime })
        } else {
          set({ currentTime: time })
        }
      },

      setVolume: (volume: number) => {
        const { audioGraph } = get()
        set({ volume })
        if (audioGraph) {
          audioGraph.setVolume(volume)
        }
      },

      setCrossfadeDuration: (duration: number) => {
        set({ crossfadeDuration: duration })
      },

      setNormalizeEnabled: (enabled: boolean) => {
        set({ normalizeEnabled: enabled })
        // Re-apply normalization to the currently loaded track slot if possible.
        const { audioGraph, currentTrack, activeMediaSlot, mediaGainA, mediaGainB } = get()
        if (!audioGraph || !currentTrack || !activeMediaSlot) return
        const gainDb = enabled ? (currentTrack.gainDb || 0) : 0
        const linearGain = gainDb ? Math.pow(10, gainDb / 20) : 1
        const now = audioGraph.getContext().currentTime
        const g = activeMediaSlot === 'A' ? mediaGainA : mediaGainB
        if (g) g.gain.setTargetAtTime(linearGain, now, 0.05)
      },

      setLoopEnabled: (enabled: boolean) => {
        set({ loopEnabled: enabled })
      },

      setTimer: (minutes: number | null) => {
        const { timerTimeoutId } = get()
        if (timerTimeoutId) {
          window.clearTimeout(timerTimeoutId)
        }
        set({ timerMinutes: minutes, timerStartTime: null, timerTimeoutId: null })
      },

      setNoiseType: (type: 'pink' | 'brown' | 'white' | null) => {
        const { noiseGenerator } = get()
        set({ noiseType: type })
        
        if (noiseGenerator) {
          if (type) {
            noiseGenerator.setType(type)
            noiseGenerator.start()
            noiseGenerator.setVolume(get().noiseVolume)
          } else {
            noiseGenerator.stop()
          }
        }
      },

      setNoiseVolume: (volume: number) => {
        const { noiseGenerator } = get()
        set({ noiseVolume: volume })
        
        if (noiseGenerator) {
          noiseGenerator.setVolume(volume)
        }
      },

      addToFavorites: (trackId: string) => {
        set(state => ({
          favoriteTracks: [...state.favoriteTracks.filter(id => id !== trackId), trackId]
        }))
      },

      removeFromFavorites: (trackId: string) => {
        set(state => ({
          favoriteTracks: state.favoriteTracks.filter(id => id !== trackId)
        }))
      },

      addToRecent: (trackId: string) => {
        set(state => ({
          recentTracks: [trackId, ...state.recentTracks.filter(id => id !== trackId)].slice(0, 20)
        }))
      },

      trackSession: (trackId: string, startTime: number, endTime: number, targetState: string, beatHz?: number) => {
        const sessions = JSON.parse(localStorage.getItem('synchra-sessions') || '[]')
        const newSession = {
          id: `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          trackId,
          startTime,
          endTime,
          duration: (endTime - startTime) / 1000, // seconds
          targetState,
          beatHz
        }
        sessions.push(newSession)
        
        // Keep only last 1000 sessions to prevent storage bloat
        const trimmedSessions = sessions.slice(-1000)
        localStorage.setItem('synchra-sessions', JSON.stringify(trimmedSessions))
      },

      reset: () => {
        const { currentSource, audioGraph, noiseGenerator, sessionStartTime, currentTrack, timerTimeoutId } = get()
        
        // Track final session if active
        if (sessionStartTime && currentTrack) {
          const sessionEnd = Date.now()
          const duration = (sessionEnd - sessionStartTime) / 1000
          if (duration > 30) {
            get().trackSession(
              currentTrack.id,
              sessionStartTime,
              sessionEnd,
              currentTrack.targetState,
              currentTrack.beatHz
            )
          }
        }
        
        if (currentSource) {
          currentSource.stop()
        }
        
        if (noiseGenerator) {
          noiseGenerator.stop()
        }

        if (timerTimeoutId) {
          window.clearTimeout(timerTimeoutId)
        }

        set({
          currentTrack: null,
          isPlaying: false,
          isLoading: false,
          currentTime: 0,
          duration: 0,
          currentSource: null,
          timerStartTime: null,
          timerTimeoutId: null,
          sessionStartTime: null,
        })
      },
    }),
    {
      name: 'synchra-player',
      partialize: (state) => ({
        volume: state.volume,
        crossfadeDuration: state.crossfadeDuration,
        normalizeEnabled: state.normalizeEnabled,
        loopEnabled: state.loopEnabled,
        noiseType: state.noiseType,
        noiseVolume: state.noiseVolume,
        recentTracks: state.recentTracks,
        favoriteTracks: state.favoriteTracks,
      }),
    }
  )
)

export default usePlayer