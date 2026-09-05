'use client'

import { useEffect, useRef, useState } from 'react'
import type { BinauralPreset } from '@/utils/binauralSynth'
import usePlayer from '@/store/usePlayer'
import { configureMediaSession, setMediaPlaybackState } from '@/utils/mediaSession'

export default function BackgroundStudioPlayer({ preset, level, noise, noiseLevel }: {
  preset: BinauralPreset; level: number; noise: 'pink' | 'brown' | 'white' | null; noiseLevel: number
}) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [error, setError] = useState('')
  const previousPreset = useRef(preset.id)
  const sourceVersion = useRef(0)
  const seconds = Math.min(5400, (preset.recommendedMinutes || 20) * 60)
  const params = new URLSearchParams({ preset: preset.id, seconds: String(seconds), level: String(level), noiseLevel: String(noiseLevel) })
  if (noise) params.set('noise', noise)
  const source = `/api/studio-audio?${params}`

  useEffect(() => {
    const audio = audioRef.current!
    const version = ++sourceVersion.current
    const update = () => {
      const resume = !audio.paused
      const time = previousPreset.current === preset.id ? audio.currentTime : 0
      previousPreset.current = preset.id
      audio.src = source
      audio.currentTime = time
      setError('')
      if (resume) void audio.play().catch(() => {
        if (version === sourceVersion.current) setError('Tap Play session to resume the updated sound.')
      })
    }
    if (!audio.getAttribute('src')) { update(); return }
    const timeout = window.setTimeout(update, 150)
    return () => window.clearTimeout(timeout)
  }, [source, preset.id])

  useEffect(() => {
    const audio = audioRef.current!
    const unsubscribe = usePlayer.subscribe(state => { if (state.isPlaying) audio.pause() })
    return () => { unsubscribe(); audio.pause(); audio.removeAttribute('src'); audio.load() }
  }, [])

  const configureSession = () => {
    const audio = audioRef.current!
    configureMediaSession(preset.name, {
      play: () => { void audio.play().catch(() => setError('Tap Play session to resume.')) },
      pause: () => audio.pause(), stop: () => { audio.pause(); audio.currentTime = 0 },
      seekto: ({ seekTime }) => { if (seekTime !== undefined) audio.currentTime = Math.max(0, Math.min(seconds, seekTime)) },
      seekbackward: ({ seekOffset }) => { audio.currentTime = Math.max(0, audio.currentTime - (seekOffset || 10)) },
      seekforward: ({ seekOffset }) => { audio.currentTime = Math.min(seconds, audio.currentTime + (seekOffset || 10)) },
    })
  }

  const play = async () => {
    usePlayer.getState().pause()
    usePlayer.getState().noiseGenerator?.stop()
    configureSession()
    try { setError(''); await audioRef.current!.play() }
    catch { setError('Could not start audio. Check your connection and tap Play session again.') }
  }

  return <div className="space-y-3 mt-4">
    <audio ref={audioRef} preload="metadata"
      onPlaying={() => { configureSession(); setError(''); setPlaying(true); setMediaPlaybackState(true) }}
      onPause={() => { setPlaying(false); setMediaPlaybackState(false) }}
      onEnded={() => { setPlaying(false); setMediaPlaybackState(false) }}
      onError={() => { setPlaying(false); setError('Audio could not load. Check your connection and try again.') }} />
    <div className="flex gap-3">
      <button className="px-5 py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
        onClick={() => playing ? audioRef.current?.pause() : void play()}>
        {playing ? 'Pause session' : 'Play session'}
      </button>
      <button className="px-4 py-3 rounded-xl border border-border" onClick={() => {
        audioRef.current?.pause()
        if (audioRef.current) audioRef.current.currentTime = 0
      }}>Stop</button>
    </div>
    <p className="text-sm text-muted-foreground">{seconds / 60}-minute stereo session with a gentle fade at each end.
      Keep this tab open when switching apps. Lock-screen controls appear where supported.
      Streaming uses about 11 MB per minute; use Wi-Fi for longer sessions.</p>
    {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
  </div>
}
