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
  
  // Noise layer
  noiseType: 'pink' | 'brown' | 'white' | null
  noiseVolume: number
  
  // History and favorites
  recentTracks: string[] // track IDs
  favoriteTracks: string[] // track IDs
  
  // Audio system
  audioGraph: AudioGraph | null
  noiseGenerator: NoiseGenerator | null
  currentSource: AudioBufferSourceNode | null
  // Streaming media elements for byte-range playback
  mediaA: HTMLAudioElement | null
  mediaB: HTMLAudioElement | null
  activeMediaSlot: 'A' | 'B' | null
  rafId?: number | null
  
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
      noiseType: null,
      noiseVolume: 0.2,
      recentTracks: [],
      favoriteTracks: [],
      audioGraph: null,
      noiseGenerator: null,
      currentSource: null,
      mediaA: null,
      mediaB: null,
      activeMediaSlot: null,
      rafId: null,

      initializeAudio: async () => {
        const { audioGraph } = get()
        if (audioGraph) return

        const graph = new AudioGraph()
        const noiseGen = new NoiseGenerator(graph.getContext())
        
        // Connect noise generator to master output
        noiseGen.connect(graph.getMasterGain())

        // Create two persistent media elements and connect to crossfader inputs
        const mediaA = new Audio()
        const mediaB = new Audio()
        mediaA.preload = 'auto'
        mediaB.preload = 'auto'
        mediaA.crossOrigin = 'anonymous'
        mediaB.crossOrigin = 'anonymous'

        const sourceA = graph.createMediaElementSource(mediaA)
        const sourceB = graph.createMediaElementSource(mediaB)
        sourceA.connect(graph.getCrossfader().getInputA())
        sourceB.connect(graph.getCrossfader().getInputB())
        
        set({ audioGraph: graph, noiseGenerator: noiseGen, mediaA, mediaB, activeMediaSlot: null })
      },

      loadTrack: async (track: Track) => {
        const { audioGraph } = get()
        if (!audioGraph) {
          await get().initializeAudio()
        }

        set({ isLoading: true, currentTrack: track })

        try {
          await audioGraph!.resume()

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
        set({ isPlaying: true })

        if (timerMinutes && !get().timerStartTime) {
          set({ timerStartTime: Date.now() })
          setTimeout(() => {
            get().pause()
            set({ timerStartTime: null })
          }, timerMinutes * 60 * 1000)
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
        const { mediaA, mediaB, rafId } = get()
        if (rafId) cancelAnimationFrame(rafId)
        if (mediaA) mediaA.pause()
        if (mediaB) mediaB.pause()
        set({ isPlaying: false, rafId: null })
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
      },

      setLoopEnabled: (enabled: boolean) => {
        set({ loopEnabled: enabled })
      },

      setTimer: (minutes: number | null) => {
        set({ timerMinutes: minutes, timerStartTime: null })
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

      reset: () => {
        const { currentSource, audioGraph, noiseGenerator } = get()
        
        if (currentSource) {
          currentSource.stop()
        }
        
        if (noiseGenerator) {
          noiseGenerator.stop()
        }

        set({
          currentTrack: null,
          isPlaying: false,
          isLoading: false,
          currentTime: 0,
          duration: 0,
          currentSource: null,
          timerStartTime: null,
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