'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Music, Settings, Library, Info, Sparkles } from 'lucide-react'

const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Synchra'

export default function Header() {
  const [showGraffiti, setShowGraffiti] = useState(false)

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2 focus-ring rounded-lg p-1">
            <div className="relative">
              <Music className="h-8 w-8 text-neon-blue" />
              {showGraffiti && (
                <div className="absolute -inset-2 opacity-30">
                  <svg className="w-12 h-12" viewBox="0 0 48 48" fill="none">
                    <path
                      d="M8 40L16 8L32 40L40 8"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="text-neon-green coder-graffiti"
                    />
                  </svg>
                </div>
              )}
            </div>
            <div>
              <div className="text-xl font-bold bg-neon-gradient bg-clip-text text-transparent">
                {appName}
              </div>
              <p className="text-xs text-muted-foreground -mt-1">
                tune probability with precision audio
              </p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center space-x-1">
            <Link
              href="/library"
              className="flex items-center space-x-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors focus-ring rounded-lg"
            >
              <Library className="h-4 w-4" />
              <span className="hidden sm:inline">Library</span>
            </Link>

            <Link
              href="/studio"
              className="flex items-center space-x-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors focus-ring rounded-lg"
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Studio</span>
            </Link>
            
            <Link
              href="/about"
              className="flex items-center space-x-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors focus-ring rounded-lg"
            >
              <Info className="h-4 w-4" />
              <span className="hidden sm:inline">About</span>
            </Link>

            <button
              onClick={() => setShowGraffiti(!showGraffiti)}
              className="flex items-center space-x-1 px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors focus-ring rounded-lg"
              title="Toggle graffiti mode"
            >
              <Settings className="h-4 w-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  )
}