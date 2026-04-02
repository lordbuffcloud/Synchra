'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Share2, Info, XCircle, Library } from 'lucide-react'
import Header from '@/components/Header'
import Player from '@/components/Player'
import { getTrack } from '@/utils/manifest'
import { Track } from '@/types/track'
import { brainwaveBands, getBandByFrequency } from '@/content/binauralScience'
import usePlayer from '@/store/usePlayer'

export default function PlayerPage() {
  const params = useParams()
  const router = useRouter()
  const trackId = params.id as string
  
  const [track, setTrack] = useState<Track | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showScience, setShowScience] = useState(false)
  
  const { loadTrack, currentTrack } = usePlayer()

  useEffect(() => {
    loadTrackData()
  }, [trackId])

  // Don't auto-load track on mount — AudioContext requires a user gesture.
  // The Player component handles loading when the user clicks play.

  const loadTrackData = async () => {
    try {
      const trackData = await getTrack(trackId)
      // Do not navigate away; show not-found state in-page
      setTrack(trackData || null)
    } catch (error) {
      console.error('Failed to load track:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleShare = async () => {
    if (!track) return

    const shareData = {
      title: track.title,
      text: `Listen to ${track.title} - ${track.description}`,
      url: window.location.href,
    }

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(window.location.href)
        // Could add a toast notification here
        console.log('Link copied to clipboard')
      }
    } catch (error) {
      console.error('Failed to share:', error)
    }
  }

  const band = track?.beatHz ? getBandByFrequency(track.beatHz) : null
  const bandInfo = band ? brainwaveBands[band] : null

  // Ambient glow color mapped to brainwave band
  const glowColor = band === 'delta'  ? 'rgba(168, 85, 247, 0.4)' :   // purple
                    band === 'theta'  ? 'rgba(129, 140, 248, 0.4)' :   // indigo
                    band === 'alpha'  ? 'rgba(34, 211, 238, 0.4)' :    // cyan
                    band === 'beta'   ? 'rgba(250, 204, 21, 0.4)' :    // yellow
                    band === 'gamma'  ? 'rgba(251, 146, 60, 0.4)' :    // orange
                                        'rgba(59, 130, 246, 0.4)'      // default blue

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
              <p className="text-muted-foreground">Loading track...</p>
              <p className="mt-2">No track selected</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!track) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-destructive/10 flex items-center justify-center">
              <XCircle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Track not found</h2>
            <p className="text-muted-foreground mb-4">
              The requested track could not be found or loaded.
            </p>
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Library
              </Link>
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 bg-muted text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted/80 transition-colors"
              >
                <Library className="w-4 h-4 mr-2" />
                Browse Library
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Ambient background glow keyed to brainwave band */}
      <div
        className="pointer-events-none fixed inset-0 z-0 animate-ambient-breathe"
        style={{
          background: `radial-gradient(ellipse 60% 50% at 50% 40%, ${glowColor}, transparent 70%)`,
        }}
      />

      <Header />

      <main className="container mx-auto px-4 py-8 relative z-10">
        {/* Navigation */}
        <div className="flex items-center justify-between mb-8">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors focus-ring rounded-lg px-3 py-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Library</span>
          </Link>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowScience(!showScience)}
              className="inline-flex items-center space-x-2 px-3 py-2 text-muted-foreground hover:text-foreground transition-colors focus-ring rounded-lg"
            >
              <Info className="w-4 h-4" />
              <span>Science</span>
            </button>

            <button
              onClick={handleShare}
              className="inline-flex items-center space-x-2 px-3 py-2 text-muted-foreground hover:text-foreground transition-colors focus-ring rounded-lg"
            >
              <Share2 className="w-4 h-4" />
              <span>Share</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Player */}
          <div className="lg:col-span-2">
            <Player track={track} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Track Details */}
            <div className="bg-card rounded-lg p-6">
              <h3 className="font-semibold mb-4">Track Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duration:</span>
                  <span>{Math.floor(track.durationSec / 60)}:{(track.durationSec % 60).toString().padStart(2, '0')}</span>
                </div>
                
                {track.beatHz && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Frequency:</span>
                    <span className="font-mono">{track.beatHz}Hz</span>
                  </div>
                )}

                {track.baseFreqHz && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base Freq:</span>
                    <span className="font-mono">{track.baseFreqHz}Hz</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target State:</span>
                  <span className="text-accent">{track.targetState}</span>
                </div>

                {track.gainDb && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Normalization:</span>
                    <span className="font-mono">{track.gainDb > 0 ? '+' : ''}{track.gainDb.toFixed(1)}dB</span>
                  </div>
                )}
              </div>

              {/* Tags */}
              {track.tags.length > 0 && (
                <div className="mt-4">
                  <div className="text-sm text-muted-foreground mb-2">Tags:</div>
                  <div className="flex flex-wrap gap-2">
                    {track.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-muted/50 text-xs rounded-full"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Science Panel */}
            {showScience && bandInfo && (
              <div className="bg-card rounded-lg p-6">
                <h3 className="font-semibold mb-4 flex items-center space-x-2">
                  <Info className="w-4 h-4 text-primary" />
                  <span>{bandInfo.name} Wave Science</span>
                </h3>
                
                <div className="space-y-4 text-sm">
                  <div>
                    <h4 className="font-medium mb-2">Range & Effects</h4>
                    <p className="text-muted-foreground mb-2">
                      <span className="font-mono text-primary">{bandInfo.range}</span>
                    </p>
                    <p className="text-muted-foreground">{bandInfo.description}</p>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Benefits</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      {bandInfo.benefits.map((benefit, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-medium mb-2">Usage Tips</h4>
                    <ul className="space-y-1 text-muted-foreground">
                      {bandInfo.tips.slice(0, 3).map((tip, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-neon-green mt-1">→</span>
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-card rounded-lg p-6">
              <h3 className="font-semibold mb-4">Quick Actions</h3>
              <div className="space-y-3">
                <button className="w-full px-4 py-2 bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors text-sm">
                  Add to Playlist
                </button>
                
                <button className="w-full px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-sm">
                  Download for Offline
                </button>
                
                <Link 
                  href="/about"
                  className="block w-full px-4 py-2 bg-muted hover:bg-muted/80 rounded-lg transition-colors text-sm text-center"
                >
                  Learn More About Binaural Beats
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}