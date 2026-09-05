// Media playback stays independent of Web Audio so mobile browsers can own it.
export function configureMediaSession(title: string, actions: Partial<Record<MediaSessionAction, MediaSessionActionHandler>>) {
  try {
    const audioSession = (navigator as Navigator & { audioSession?: { type: string } }).audioSession
    if (audioSession) audioSession.type = 'playback'
  } catch { /* Optional browser feature. */ }
  if (!('mediaSession' in navigator)) return
  try {
    navigator.mediaSession.metadata = new MediaMetadata({ title, artist: 'Synchra', artwork: [
      { src: new URL('/icon-512.png', location.href).href, sizes: '512x512', type: 'image/png' },
    ] })
  } catch { /* Metadata must not block playback. */ }
  for (const action of ['play', 'pause', 'stop', 'seekto', 'seekbackward', 'seekforward'] as MediaSessionAction[]) {
    try { navigator.mediaSession.setActionHandler(action, actions[action] || null) } catch { /* Unsupported action. */ }
  }
}

export function setMediaPlaybackState(playing: boolean) {
  try {
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
  } catch { /* Optional browser feature. */ }
}
