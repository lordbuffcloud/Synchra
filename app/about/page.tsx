import Link from 'next/link'
import { ArrowLeft, Brain, Headphones, Zap, Moon, Heart, Sparkles } from 'lucide-react'
import Header from '@/components/Header'
import { brainwaveBands, generalTips, presetSessions } from '@/content/binauralScience'

const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Synchra'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center space-x-2 text-muted-foreground hover:text-foreground transition-colors focus-ring rounded-lg px-3 py-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Library</span>
          </Link>
        </div>

        {/* Hero */}
        <section className="text-center mb-16">
          <h1 className="text-4xl sm:text-5xl font-bold mb-6">
            <span className="bg-neon-gradient bg-clip-text text-transparent">About {appName}</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            {appName} delivers scientifically-backed binaural beats for focus, relaxation, and consciousness exploration. 
            Our precision audio technology helps modern minds optimize their cognitive states through carefully crafted soundscapes.
          </p>
        </section>

        {/* What Are Binaural Beats */}
        <section className="mb-16">
          <div className="bg-card rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-6 flex items-center space-x-3">
              <Brain className="h-6 w-6 text-primary" />
              <span>What Are Binaural Beats?</span>
            </h2>
            
            <div className="grid md:grid-cols-2 gap-8">
              <div>
                <p className="text-muted-foreground mb-4">
                  Binaural beats occur when two slightly different frequencies are played in each ear. 
                  Your brain processes the difference between these frequencies, creating a third "phantom" 
                  tone that can influence your brainwave activity.
                </p>
                <p className="text-muted-foreground mb-4">
                  For example, if your left ear hears 200Hz and your right ear hears 206Hz, your brain 
                  perceives a 6Hz binaural beat. This can guide your brainwaves toward the theta state 
                  associated with creativity and meditation.
                </p>
                <p className="text-muted-foreground">
                  This phenomenon, called "brainwave entrainment," has been studied extensively and shows 
                  measurable effects on consciousness, focus, and relaxation.
                </p>
              </div>
              
              <div className="bg-muted/20 rounded-lg p-6">
                <h3 className="font-semibold mb-3">How It Works</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-xs font-bold">1</div>
                    <span>Two pure tones at slightly different frequencies</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-xs font-bold">2</div>
                    <span>Delivered separately to each ear via headphones</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-xs font-bold">3</div>
                    <span>Brain creates perception of beating rhythm</span>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-xs font-bold">4</div>
                    <span>Brainwaves gradually synchronize to the beat frequency</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Brainwave Bands */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">Brainwave Frequency Bands</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(brainwaveBands).map(([key, band]) => {
              const icons: Record<string, any> = {
                delta: Moon,
                theta: Sparkles,
                alpha: Heart,
                beta: Zap,
                gamma: Brain
              }
              const Icon = icons[key] || Brain
              
              return (
                <div key={key} className="bg-card rounded-lg p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <Icon className="h-6 w-6 text-primary" />
                    <div>
                      <h3 className="font-semibold text-lg">{band.name}</h3>
                      <p className="text-sm text-muted-foreground font-mono">{band.range}</p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mb-4 line-clamp-3">
                    {band.description}
                  </p>
                  
                  <div className="mb-4">
                    <h4 className="font-medium text-sm mb-2">Key Benefits:</h4>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {band.benefits.slice(0, 3).map((benefit, index) => (
                        <li key={index} className="flex items-start space-x-2">
                          <span className="text-primary mt-0.5">•</span>
                          <span>{benefit}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium text-sm mb-2">Usage Tip:</h4>
                    <p className="text-xs text-neon-green bg-neon-green/10 rounded p-2">
                      {band.tips[0]}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Features */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">Platform Features</h2>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-card rounded-lg p-6 text-center">
              <Headphones className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">High-Quality Audio</h3>
              <p className="text-sm text-muted-foreground">
                Opus and AAC encoding at optimal bitrates for crystal-clear binaural beats
              </p>
            </div>
            
            <div className="bg-card rounded-lg p-6 text-center">
              <Zap className="h-12 w-12 text-neon-green mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Loudness Normalization</h3>
              <p className="text-sm text-muted-foreground">
                LUFS-based normalization ensures consistent perceived volume across all tracks
              </p>
            </div>
            
            <div className="bg-card rounded-lg p-6 text-center">
              <Moon className="h-12 w-12 text-purple-400 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Offline Playback</h3>
              <p className="text-sm text-muted-foreground">
                Progressive Web App with service worker caching for offline listening
              </p>
            </div>
            
            <div className="bg-card rounded-lg p-6 text-center">
              <Brain className="h-12 w-12 text-neon-purple mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Crossfade & Limiting</h3>
              <p className="text-sm text-muted-foreground">
                Smooth transitions and audio limiting prevent jarring interruptions
              </p>
            </div>
            
            <div className="bg-card rounded-lg p-6 text-center">
              <Sparkles className="h-12 w-12 text-neon-blue mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Noise Layers</h3>
              <p className="text-sm text-muted-foreground">
                Pink, brown, and white noise options to mask environmental distractions
              </p>
            </div>
            
            <div className="bg-card rounded-lg p-6 text-center">
              <Heart className="h-12 w-12 text-red-400 mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Smart Timers</h3>
              <p className="text-sm text-muted-foreground">
                Gentle fade-out timers help transition naturally between activities
              </p>
            </div>
          </div>
        </section>

        {/* General Tips */}
        <section className="mb-16">
          <div className="bg-primary/5 border border-primary/10 rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-6 text-primary">Usage Guidelines & Tips</h2>
            
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-semibold mb-3">Getting Started</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {generalTips.slice(0, 5).map((tip, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-primary mt-0.5">→</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3">Advanced Tips</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {generalTips.slice(5).map((tip, index) => (
                    <li key={index} className="flex items-start space-x-2">
                      <span className="text-neon-green mt-0.5">→</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Preset Sessions */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">Recommended Sessions</h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {presetSessions.map((session) => (
              <div key={session.name} className="bg-card rounded-lg p-6">
                <h3 className="font-semibold text-lg mb-2">{session.name}</h3>
                <p className="text-sm text-muted-foreground mb-4">{session.description}</p>
                
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Duration:</span>
                    <span>{session.duration} minutes</span>
                  </div>
                  
                  <div>
                    <span className="text-muted-foreground">Sequence:</span>
                    <ul className="mt-1 space-y-1">
                      {session.sequence.map((step, index) => (
                        <li key={index} className="flex justify-between ml-2">
                          <span className="capitalize">{step.trackPattern}</span>
                          <span>{step.duration}m</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Technical Details */}
        <section className="mb-16">
          <div className="bg-muted/20 rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-6">Technical Implementation</h2>
            
            <div className="grid md:grid-cols-2 gap-8 text-sm">
              <div>
                <h3 className="font-semibold mb-3">Audio Processing</h3>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• FFmpeg transcoding with -16 LUFS normalization</li>
                  <li>• Opus (128kbps) and AAC (192kbps) formats</li>
                  <li>• Web Audio API with dynamics compression</li>
                  <li>• Gapless playback and crossfade transitions</li>
                  <li>• Real-time waveform visualization</li>
                </ul>
              </div>
              
              <div>
                <h3 className="font-semibold mb-3">Platform Stack</h3>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Next.js 14 with App Router</li>
                  <li>• TypeScript and Tailwind CSS</li>
                  <li>• Zustand state management</li>
                  <li>• Service Worker caching</li>
                  <li>• Vercel deployment optimization</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">Frequently Asked Questions</h2>
          
          <div className="space-y-6">
            {[
              {
                q: "Do I need special headphones?",
                a: "Closed-back headphones work best as they provide isolation and prevent the binaural effect from being compromised by external sounds. Standard headphones or earbuds will work fine."
              },
              {
                q: "How long should I listen?",
                a: "Start with 15-30 minute sessions and gradually increase. Delta frequencies can be used for longer periods during sleep, while gamma should be limited to 10-20 minutes."
              },
              {
                q: "Can I use this while working?",
                a: "Yes! Alpha and beta frequencies are designed for focus and productivity. Use our Focus category tracks during work sessions."
              },
              {
                q: "Is it safe?",
                a: "Binaural beats are generally safe for healthy individuals. Avoid use if you have epilepsy, heart conditions, or are pregnant. Consult a physician if you have concerns."
              },
              {
                q: "Why does the volume seem different between tracks?",
                a: "All tracks are normalized to -16 LUFS for consistent perceived loudness. Enable the normalization feature in player settings for the best experience."
              }
            ].map((faq, index) => (
              <div key={index} className="bg-card rounded-lg p-6">
                <h3 className="font-semibold mb-2">{faq.q}</h3>
                <p className="text-sm text-muted-foreground">{faq.a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Credits */}
        <section className="text-center">
          <div className="bg-card rounded-xl p-8">
            <h2 className="text-2xl font-bold mb-4">{appName}</h2>
            <p className="text-muted-foreground mb-4">
              Built for the modern mind seeking precision audio experiences.
            </p>
            <p className="text-sm text-muted-foreground">
              Powered by Next.js, Web Audio API, and carefully crafted binaural frequencies.
            </p>
            
            <div className="mt-6 pt-6 border-t border-border">
              <Link 
                href="/"
                className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                Start Listening
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}