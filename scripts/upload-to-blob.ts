/**
 * Upload all local audio tracks to Vercel Blob and update tracks.json
 * with remote URLs.
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_... npx tsx scripts/upload-to-blob.ts
 */

import { put, list } from '@vercel/blob'
import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { basename, join } from 'path'

const TRACKS_DIR = join(__dirname, '..', 'public', 'tracks')
const MANIFEST_PATH = join(TRACKS_DIR, 'tracks.json')

interface Track {
  id: string
  filenameWebm: string
  filenameAac: string
  remoteWebmUrl?: string
  remoteAacUrl?: string
  [key: string]: any
}

interface Manifest {
  tracks: Track[]
  totalTracks: number
  lastUpdated: string
}

async function main() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    console.error('Error: BLOB_READ_WRITE_TOKEN environment variable is required')
    process.exit(1)
  }

  // Find all audio files
  const files = readdirSync(TRACKS_DIR)
  const webmFiles = files.filter(file => file.endsWith('.webm'))
  const m4aFiles = files.filter(file => file.endsWith('.m4a'))
  const allFiles = [...webmFiles, ...m4aFiles].sort()

  console.log(`Found ${allFiles.length} audio files to upload (${webmFiles.length} webm + ${m4aFiles.length} m4a)`)

  // Check what's already uploaded
  let existingBlobs = new Map<string, string>()
  try {
    let cursor: string | undefined
    do {
      const result = await list({ cursor, limit: 1000 })
      for (const blob of result.blobs) {
        existingBlobs.set(blob.pathname, blob.url)
      }
      cursor = result.cursor
    } while (cursor)
    console.log(`Found ${existingBlobs.size} existing blobs`)
  } catch {
    console.log('Could not list existing blobs, will upload all')
  }

  // Upload each file
  const urlMap = new Map<string, string>()
  let uploaded = 0
  let skipped = 0

  for (const file of allFiles) {
    const blobPath = `tracks/${file}`

    // Skip if already uploaded
    if (existingBlobs.has(blobPath)) {
      urlMap.set(file, existingBlobs.get(blobPath)!)
      skipped++
      process.stdout.write(`  [skip] ${file} (already uploaded)\n`)
      continue
    }

    const filePath = join(TRACKS_DIR, file)
    const data = readFileSync(filePath)
    const contentType = file.endsWith('.webm') ? 'audio/webm' : 'audio/mp4'

    try {
      const blob = await put(blobPath, data, {
        access: 'public',
        contentType,
        addRandomSuffix: false,
      })
      urlMap.set(file, blob.url)
      uploaded++
      const sizeMB = (data.length / 1024 / 1024).toFixed(1)
      process.stdout.write(`  [upload] ${file} (${sizeMB} MB) → ${blob.url}\n`)
    } catch (error: any) {
      console.error(`  [FAIL] ${file}: ${error.message}`)
    }
  }

  console.log(`\nUploaded: ${uploaded}, Skipped: ${skipped}, Total: ${allFiles.length}`)

  // Update tracks.json with remote URLs
  const manifest: Manifest = JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8'))
  let updated = 0

  for (const track of manifest.tracks) {
    const webmUrl = urlMap.get(track.filenameWebm)
    const aacUrl = urlMap.get(track.filenameAac)

    if (webmUrl && track.remoteWebmUrl !== webmUrl) {
      track.remoteWebmUrl = webmUrl
      updated++
    }
    if (aacUrl && track.remoteAacUrl !== aacUrl) {
      track.remoteAacUrl = aacUrl
      updated++
    }
  }

  if (updated > 0) {
    manifest.lastUpdated = new Date().toISOString()
    writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n')
    console.log(`\nUpdated ${updated} URLs in tracks.json`)
  } else {
    console.log('\nNo manifest updates needed')
  }
}

main().catch(console.error)
