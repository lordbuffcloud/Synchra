import { PRESETS } from '@/content/studioPresets'
import { FRAME_BYTES, SAMPLE_RATE, renderWavRange, StudioAudioOptions } from '@/utils/studioPcm'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function respond(request: Request, head = false): Response {
  const params = new URL(request.url).searchParams
  const preset = PRESETS.find(p => p.id === params.get('preset'))
  const seconds = Number(params.get('seconds') || (preset?.recommendedMinutes || 20) * 60)
  const level = Number(params.get('level') ?? 0.18)
  const noiseLevel = Number(params.get('noiseLevel') ?? 0.2)
  const noise = params.get('noise') || null
  if (!preset || !Number.isInteger(seconds) || seconds < 1 || seconds > 5400 ||
      !Number.isFinite(level) || level < 0 || level > 0.35 ||
      !Number.isFinite(noiseLevel) || noiseLevel < 0 || noiseLevel > 0.5 ||
      (noise !== null && !['pink', 'brown', 'white'].includes(noise))) {
    return new Response('Invalid audio settings', { status: 400 })
  }
  const options: StudioAudioOptions = { preset, seconds, level, noiseLevel, noise: noise as StudioAudioOptions['noise'] }
  const length = 44 + seconds * SAMPLE_RATE * FRAME_BYTES
  let start = 0
  let end = length - 1
  const range = head ? null : request.headers.get('range')
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range)
    if (!match || (!match[1] && !match[2])) return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${length}` } })
    if (!match[1]) start = Math.max(0, length - Number(match[2]))
    else {
      start = Number(match[1])
      end = match[2] ? Math.min(end, Number(match[2])) : end
    }
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= length) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${length}` } })
    }
    // Bound CPU, memory and response size per media request. Browser requests the remainder.
    end = Math.min(end, start + 1024 * 1024 - 1)
  }
  const headers: Record<string, string> = {
    'Content-Type': 'audio/wav', 'Accept-Ranges': 'bytes',
    'Content-Length': String(end - start + 1), 'Cache-Control': 'private, max-age=3600, no-transform',
  }
  if (range) headers['Content-Range'] = `bytes ${start}-${end}/${length}`
  let position = start
  const body = head ? null : new ReadableStream<Uint8Array>({
    pull(controller) {
      if (request.signal.aborted) { controller.close(); return }
      const chunkEnd = Math.min(end, position + 16384 - 1)
      controller.enqueue(renderWavRange(options, position, chunkEnd))
      position = chunkEnd + 1
      if (position > end) controller.close()
    },
  })
  return new Response(body, { status: range ? 206 : 200, headers })
}
export function GET(request: Request) { return respond(request) }
export function HEAD(request: Request) { return respond(request, true) }
