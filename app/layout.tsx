import type { Metadata, Viewport } from 'next'
import './globals.css'

const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Synchra'

export const metadata: Metadata = {
  title: {
    default: appName,
    template: `%s | ${appName}`,
  },
  description: 'Tune probability with precision audio.',
  keywords: ['binaural beats', 'meditation', 'focus', 'sleep', 'audio'],
  authors: [{ name: appName }],
  creator: appName,
  metadataBase: new URL(process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: './',
    siteName: appName,
    title: appName,
    description: 'Tune probability with precision audio.',
  },
  twitter: {
    card: 'summary_large_image',
    title: appName,
    description: 'Tune probability with precision audio.',
    creator: `@${appName}`,
  },
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: appName,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0b0d10',
  colorScheme: 'dark',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background font-sans antialiased">
        <div className="relative flex min-h-screen flex-col">
          <div className="flex-1">{children}</div>
        </div>
      </body>
    </html>
  )
}