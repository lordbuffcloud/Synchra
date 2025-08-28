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

      initializeAudio: async () => {
        const { audioGraph } = get()
        if (audioGraph) return

        const graph = new AudioGraph()
        const noiseGen = new NoiseGenerator(graph.getContext())
        
        // Connect noise generator to master output
        noiseGen.connect(graph.getMasterGain())
        
        set({ audioGraph: graph, noiseGenerator: noiseGen })
      },

      loadTrack: async (track: Track) => {
        const { audioGraph, normalizeEnabled } = get()
        if (!audioGraph) {
          await get().initializeAudio()
        }

        set({ isLoading: true, currentTrack: track })

        try {
          await audioGraph!.resume()

          // Determine which format to use (prefer Opus for better compression)
          const supportsOpus = 'MediaSource' in window && MediaSource.isTypeSupported('audio/webm; codecs="opus"')
          const trackUrl = supportsOpus ? `/tracks/${track.filenameWebm}` : `/tracks/${track.filenameAac}`

          // Fetch and decode audio
          const response = await fetch(trackUrl)
          if (!response.ok) {
            throw new Error(`Failed to load track: ${response.status}`)
          }

          const arrayBuffer = await response.arrayBuffer()
          const audioBuffer = await audioGraph!.getContext().decodeAudioData(arrayBuffer)

          // Store audio buffer in track for reuse
          ;(track as any)._audioBuffer = audioBuffer

          set({ 
            duration: audioBuffer.duration,
            isLoading: false,
          })

          // Add to recent tracks
          get().addToRecent(track.id)

        } catch (error) {
          console.error('Failed to load track:', error)
          set({ isLoading: false })
          throw error
        }
      },

      play: async () => {
        const { currentTrack, audioGraph, normalizeEnabled, loopEnabled, timerMinutes } = get()
        if (!currentTrack || !audioGraph) return

        await audioGraph.resume()

        // Stop current source if playing
        const { currentSource } = get()
        if (currentSource) {
          currentSource.stop()
        }

        // Create new source
        const source = audioGraph.getContext().createBufferSource()
        source.buffer = (currentTrack as any)._audioBuffer
        source.loop = loopEnabled

        // Apply normalization if enabled
        let outputNode: AudioNode = source
        if (normalizeEnabled && currentTrack.gainDb) {
          outputNode = audioGraph.applyNormalization(source, currentTrack.gainDb) || source
        }

        // Connect to crossfader inputs and perform crossfade if switching
        const crossfader = audioGraph.getCrossfader()
        outputNode.connect(crossfader.getInactiveInput())

        // Handle playback end
        source.onended = () => {
          if (!loopEnabled) {
            set({ isPlaying: false, currentTime: 0 })
          }
        }

        // Start playback and crossfade
        source.start()
        await crossfader.crossfade(get().crossfadeDuration)
        set({ currentSource: source, isPlaying: true })

        // Start timer if set
        if (timerMinutes && !get().timerStartTime) {
          set({ timerStartTime: Date.now() })
          
          setTimeout(() => {
            get().pause()
            set({ timerStartTime: null })
          }, timerMinutes * 60 * 1000)
        }

        // Update current time
        const updateTime = () => {
          if (get().isPlaying && source.buffer) {
            const elapsed = audioGraph.getContext().currentTime - (source as any).startTime
            set({ currentTime: elapsed })
            requestAnimationFrame(updateTime)
          }
        }
        ;(source as any).startTime = audioGraph.getContext().currentTime
        updateTime()
      },

      pause: () => {
        const { currentSource } = get()
        if (currentSource) {
          currentSource.stop()
        }
        set({ isPlaying: false, currentSource: null })
      },

      seek: (time: number) => {
        const { isPlaying } = get()
        set({ currentTime: time })
        
        if (isPlaying) {
          get().pause()
          // Restart from new position would require more complex implementation
          // For now, just update the time
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