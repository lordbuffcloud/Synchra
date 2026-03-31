'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Music, Settings, Library, Info, Sparkles, Home } from 'lucide-react'

const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Synchra'

const navItems = [
  { href: '/', label: 'Home', icon: Home, match: /^\/$/ },
  { href: '/library', label: 'Library', icon: Library, match: /^\/library/ },
  { href: '/studio', label: 'Studio', icon: Sparkles, match: /^\/studio/ },
  { href: '/about', label: 'About', icon: Info, match: /^\/about/ },
]

export default function Header() {
  const pathname = usePathname()

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2.5 focus-ring rounded-lg p-1 group">
            <div className="relative w-9 h-9 rounded-xl bg-neon-gradient flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/40 transition-shadow">
              <Music className="h-5 w-5 text-black" />
            </div>
            <div>
              <div className="text-xl font-bold bg-neon-gradient bg-clip-text text-transparent">
                {appName}
              </div>
              <p className="text-[10px] text-muted-foreground -mt-0.5 tracking-wider uppercase">
                precision audio
              </p>
            </div>
          </Link>

          {/* Navigation */}
          <nav className="flex items-center gap-1">
            {navItems.map(({ href, label, icon: Icon, match }) => {
              const isActive = match.test(pathname)
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg transition-all ${
                    isActive
                      ? 'text-primary bg-primary/10 font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/30'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </header>
  )
}
