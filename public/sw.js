const CACHE_NAME = 'synchra-v1'
const STATIC_CACHE_NAME = 'synchra-static-v1'
const AUDIO_CACHE_NAME = 'synchra-audio-v1'

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icon-192.png',
  '/icon-512.png',
  '/tracks/tracks.json'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS.filter(url => url !== '/tracks/tracks.json'))
        .catch((error) => {
          console.warn('Failed to cache some static assets:', error)
        })
    })
  )
  self.skipWaiting()
})

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && 
              cacheName !== STATIC_CACHE_NAME && 
              cacheName !== AUDIO_CACHE_NAME) {
            return caches.delete(cacheName)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Fetch event - handle requests
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Ignore non-http(s) schemes (e.g., chrome-extension)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return
  }

  // Handle audio files specially
  if (url.pathname.startsWith('/tracks/') && 
      (url.pathname.endsWith('.webm') || 
       url.pathname.endsWith('.m4a') || 
       url.pathname.endsWith('.json'))) {
    event.respondWith(handleAudioRequest(request))
    return
  }

  // Handle API and dynamic requests
  if (url.pathname.startsWith('/api/') || 
      url.pathname.startsWith('/_next/') || 
      request.method !== 'GET') {
    event.respondWith(fetch(request))
    return
  }

  // Handle static assets
  event.respondWith(handleStaticRequest(request))
})

async function handleAudioRequest(request) {
  const cache = await caches.open(AUDIO_CACHE_NAME)
  const cachedResponse = await cache.match(request)

  if (cachedResponse) {
    return cachedResponse
  }

  try {
    const response = await fetch(request)
    if (response.ok) {
      // Clone before caching
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    console.warn('Failed to fetch audio:', error)
    
    // Return cached version if available, even if stale
    const staleResponse = await cache.match(request)
    if (staleResponse) {
      return staleResponse
    }
    
    throw error
  }
}

async function handleStaticRequest(request) {
  try {
    // Network first for HTML pages
    if (request.headers.get('accept')?.includes('text/html')) {
      try {
        const response = await fetch(request)
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME)
          cache.put(request, response.clone())
        }
        return response
      } catch {
        // Fall back to cache for offline support
        const cache = await caches.open(CACHE_NAME)
        const cachedResponse = await cache.match(request)
        if (cachedResponse) {
          return cachedResponse
        }
        
        // Return offline page fallback
        return new Response(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Synchra - Offline</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { 
                  font-family: system-ui, sans-serif; 
                  background: #0b0d10; 
                  color: white; 
                  display: flex; 
                  align-items: center; 
                  justify-content: center; 
                  min-height: 100vh; 
                  margin: 0; 
                  text-align: center; 
                }
                .container { padding: 2rem; }
                h1 { color: #3b82f6; margin-bottom: 1rem; }
                p { color: #9ca3af; }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>🎵 Synchra</h1>
                <p>You're offline. Please check your connection and try again.</p>
                <button onclick="location.reload()" style="
                  background: #3b82f6; 
                  color: white; 
                  border: none; 
                  padding: 0.75rem 1.5rem; 
                  border-radius: 0.5rem; 
                  cursor: pointer; 
                  margin-top: 1rem;
                ">Retry</button>
              </div>
            </body>
          </html>
        `, {
          status: 200,
          headers: { 'Content-Type': 'text/html' }
        })
      }
    }

    // Cache first for other assets
    const cache = await caches.open(STATIC_CACHE_NAME)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      return cachedResponse
    }

    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch (error) {
    console.warn('Request failed:', error)
    throw error
  }
}

// Background sync for track manifest updates
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-tracks') {
    event.waitUntil(syncTracks())
  }
})

async function syncTracks() {
  try {
    const response = await fetch('/tracks/tracks.json')
    if (response.ok) {
      const cache = await caches.open(AUDIO_CACHE_NAME)
      cache.put('/tracks/tracks.json', response.clone())
    }
  } catch (error) {
    console.warn('Failed to sync tracks:', error)
  }
}

// Message handling for cache management
self.addEventListener('message', (event) => {
  const { type, data } = event.data

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break
      
    case 'CACHE_AUDIO':
      if (data.url) {
        event.waitUntil(cacheAudio(data.url))
      }
      break
      
    case 'GET_CACHE_STATUS':
      event.waitUntil(getCacheStatus().then(status => {
        event.ports[0].postMessage({ type: 'CACHE_STATUS', data: status })
      }))
      break
      
    case 'CLEAR_CACHE':
      event.waitUntil(clearCaches().then(() => {
        event.ports[0].postMessage({ type: 'CACHE_CLEARED' })
      }))
      break
  }
})

async function cacheAudio(url) {
  try {
    const cache = await caches.open(AUDIO_CACHE_NAME)
    const response = await fetch(url)
    if (response.ok) {
      await cache.put(url, response)
    }
  } catch (error) {
    console.warn('Failed to cache audio:', url, error)
  }
}

async function getCacheStatus() {
  const [staticCache, audioCache] = await Promise.all([
    caches.open(STATIC_CACHE_NAME),
    caches.open(AUDIO_CACHE_NAME)
  ])

  const [staticKeys, audioKeys] = await Promise.all([
    staticCache.keys(),
    audioCache.keys()
  ])

  return {
    staticCachedCount: staticKeys.length,
    audioCachedCount: audioKeys.length,
    totalSize: await getCacheSize()
  }
}

async function getCacheSize() {
  // Estimate cache size (not exact but good enough)
  let totalSize = 0
  const cacheNames = [STATIC_CACHE_NAME, AUDIO_CACHE_NAME]
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName)
    const keys = await cache.keys()
    totalSize += keys.length * 100 // Rough estimate
  }
  
  return totalSize
}

async function clearCaches() {
  const cacheNames = await caches.keys()
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  )
}