#!/usr/bin/env tsx

import { exec } from 'child_process'
import { promisify } from 'util'
import * as fs from 'fs/promises'
import * as path from 'path'
import { Track, TargetState, TrackManifest } from '../types/track'

const execAsync = promisify(exec)

const CACHE_DIR = '.cache/raw'
const OUTPUT_DIR = 'public/tracks'
const PEAKS_DIR = 'public/tracks/peaks'

interface DriveFileInfo {
  id: string
  name: string
  downloadUrl: string
  size?: number
  etag?: string
}

class TrackFetcher {
  private driveFiles: DriveFileInfo[] = []

  async init() {
    await this.ensureDirectories()
    await this.checkDependencies()
  }

  private async ensureDirectories() {
    await fs.mkdir(CACHE_DIR, { recursive: true })
    await fs.mkdir(OUTPUT_DIR, { recursive: true })
    await fs.mkdir(PEAKS_DIR, { recursive: true })
  }

  private async checkDependencies() {
    try {
      await execAsync('ffmpeg -version')
      await execAsync('ffprobe -version')
    } catch (error) {
      console.error('❌ FFmpeg not found. Please install FFmpeg and FFprobe:')
      console.error('  - Windows: https://ffmpeg.org/download.html#build-windows')
      console.error('  - macOS: brew install ffmpeg')
      console.error('  - Linux: apt-get install ffmpeg')
      process.exit(1)
    }
  }

  async fetchFromDriveFolder(): Promise<DriveFileInfo[]> {
    const folderUrl = process.env.DRIVE_FOLDER_URL
    if (!folderUrl) {
      console.warn('⚠️  DRIVE_FOLDER_URL not set, checking for DRIVE_FILE_IDS...')
      return this.fetchFromFileIds()
    }

    const folderId = this.extractFolderId(folderUrl)
    if (!folderId) {
      throw new Error('Invalid Google Drive folder URL')
    }

    // Prefer API if key is available (more reliable), otherwise scrape
    if (process.env.GOOGLE_API_KEY) {
      return this.fetchFromApiRecursive(folderId)
    }

    console.log(`🔍 Scanning public folder (scrape): ${folderId}`)
    const visited = new Set<string>()
    const allFiles: DriveFileInfo[] = []

    const crawl = async (id: string) => {
      if (visited.has(id)) return
      visited.add(id)
      const url = `https://drive.google.com/embeddedfolderview?id=${id}#list`
      const res = await fetch(url)
      const html = await res.text()

      // Find file links
      const linkRegex = /href=\"([^\"]*?id=([a-zA-Z0-9_-]{10,}))[^\"]*\"[^>]*>([^<]+)<\/a>/g
      let match: RegExpExecArray | null
      const audioExt = /\.(mp3|wav|flac|m4a)$/i

      while ((match = linkRegex.exec(html)) !== null) {
        const href = match[1]
        const idMatch = match[2]
        const text = match[3].trim()

        // Subfolder links usually point to embeddedfolderview again or to /folders/
        if (/embeddedfolderview|\/folders\//.test(href)) {
          // Likely a folder, recurse
          await crawl(idMatch)
          continue
        }

        // File links typically point to /uc?id=...; filter audio files
        if (audioExt.test(text)) {
          allFiles.push({
            id: idMatch,
            name: text,
            downloadUrl: `https://drive.google.com/uc?id=${idMatch}&export=download`,
          })
        }
      }
    }

    await crawl(folderId)
    console.log(`✅ Found ${allFiles.length} audio files in public folder (scrape)`)   
    return allFiles
  }

  private extractFolderId(url: string): string | null {
    const match = url.match(/\/folders\/([a-zA-Z0-9-_]+)/)
    return match ? match[1] : null
  }

  private async fetchFromFileIds(): Promise<DriveFileInfo[]> {
    const fileIds = process.env.DRIVE_FILE_IDS
    if (!fileIds) {
      console.warn('⚠️  No DRIVE_FILE_IDS provided, creating empty manifest')
      return []
    }

    const ids = fileIds.split(',').map(id => id.trim()).filter(Boolean)
    return ids.map((id, index) => ({
      id,
      name: `track_${index + 1}.mp3`,
      downloadUrl: `https://drive.google.com/uc?id=${id}&export=download`,
    }))
  }

  private async fetchFromApi(folderId: string): Promise<DriveFileInfo[]> {
    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) {
      throw new Error('GOOGLE_API_KEY required for private folder access')
    }

    const url = `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&key=${apiKey}&fields=files(id,name,size,md5Checksum)`
    
    try {
      const response = await fetch(url)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(`API Error: ${data.error?.message || 'Unknown error'}`)
      }

      const audioFiles = (data.files || []).filter((file: any) => 
        /\\.(mp3|wav|flac|m4a)$/i.test(file.name)
      )

      return audioFiles.map((file: any) => ({
        id: file.id,
        name: file.name,
        downloadUrl: `https://drive.google.com/uc?id=${file.id}&export=download`,
        size: parseInt(file.size) || undefined,
        etag: file.md5Checksum,
      }))
    } catch (error) {
      console.error('❌ Google Drive API error:', error)
      return []
    }
  }

  private async fetchFromApiRecursive(folderId: string): Promise<DriveFileInfo[]> {
    const apiKey = process.env.GOOGLE_API_KEY
    if (!apiKey) return []

    const files: DriveFileInfo[] = []

    const list = async (parentId: string) => {
      const url = `https://www.googleapis.com/drive/v3/files?q='${parentId}'+in+parents&key=${apiKey}&fields=files(id,name,mimeType,size,md5Checksum)`
      const response = await fetch(url)
      const data = await response.json()
      const entries = (data.files || [])
      for (const entry of entries) {
        if (entry.mimeType === 'application/vnd.google-apps.folder') {
          await list(entry.id)
        } else if (/\.(mp3|wav|flac|m4a)$/i.test(entry.name)) {
          files.push({
            id: entry.id,
            name: entry.name,
            downloadUrl: `https://drive.google.com/uc?id=${entry.id}&export=download`,
            size: parseInt(entry.size || '0') || undefined,
            etag: entry.md5Checksum,
          })
        }
      }
    }

    await list(folderId)
    console.log(`✅ Found ${files.length} audio files via Drive API`)
    return files
  }

  async downloadFile(file: DriveFileInfo): Promise<string> {
    const cachePath = path.join(CACHE_DIR, file.name)
    
    // Check if file already exists and is current
    try {
      const stats = await fs.stat(cachePath)
      if (file.size && stats.size === file.size) {
        console.log(`⏭️  Cached: ${file.name}`)
        return cachePath
      }
    } catch {
      // File doesn't exist, proceed with download
    }

    console.log(`⬇️  Downloading: ${file.name}`)
    
    try {
      const response = await fetch(file.downloadUrl)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const buffer = await response.arrayBuffer()
      await fs.writeFile(cachePath, new Uint8Array(buffer))
      console.log(`✅ Downloaded: ${file.name} (${(buffer.byteLength / 1024 / 1024).toFixed(1)}MB)`)
      
      return cachePath
    } catch (error) {
      console.error(`❌ Download failed for ${file.name}:`, error)
      throw error
    }
  }

  async transcodeFile(inputPath: string, outputBaseName: string): Promise<{
    webmPath: string
    aacPath: string
    durationSec: number
    gainDb: number
  }> {
    const webmPath = path.join(OUTPUT_DIR, `${outputBaseName}.webm`)
    const aacPath = path.join(OUTPUT_DIR, `${outputBaseName}.m4a`)

    // Get duration and audio analysis
    const probeCmd = `ffprobe -v quiet -show_entries format=duration -of csv=p=0 "${inputPath}"`
    const { stdout: durationStr } = await execAsync(probeCmd)
    const durationSec = Math.round(parseFloat(durationStr.trim()))

    // Analyze loudness for normalization
    let gainDb = 0
    try {
      const loudnessCmd = `ffmpeg -i "${inputPath}" -af loudnorm=I=-16:print_format=json -f null - 2>&1`
      const { stderr: loudnessOutput } = await execAsync(loudnessCmd)
      const loudnessMatch = loudnessOutput.match(/"input_i"\\s*:\\s*"([^"]+)"/)
      if (loudnessMatch) {
        const inputLufs = parseFloat(loudnessMatch[1])
        gainDb = -16.0 - inputLufs
        console.log(`🎚️  Calculated gain: ${gainDb.toFixed(1)} dB (input: ${inputLufs.toFixed(1)} LUFS)`)
      }
    } catch (error) {
      console.warn(`⚠️  Loudness analysis failed for ${path.basename(inputPath)}, using 0dB gain`)
    }

    // Transcode to Opus (WebM container)
    const webmCmd = `ffmpeg -i "${inputPath}" -c:a libopus -b:a 128k -af "loudnorm=I=-16:LRA=11:TP=-1.5" -y "${webmPath}"`
    await execAsync(webmCmd)
    console.log(`🎵 Transcoded to Opus: ${outputBaseName}.webm`)

    // Transcode to AAC (M4A container)  
    const aacCmd = `ffmpeg -i "${inputPath}" -c:a aac -b:a 192k -af "loudnorm=I=-16:LRA=11:TP=-1.5" -y "${aacPath}"`
    await execAsync(aacCmd)
    console.log(`🎵 Transcoded to AAC: ${outputBaseName}.m4a`)

    return {
      webmPath,
      aacPath,
      durationSec,
      gainDb,
    }
  }

  async generateWaveformPeaks(inputPath: string, outputBaseName: string): Promise<string> {
    const peaksPath = path.join(PEAKS_DIR, `${outputBaseName}.json`)
    const { spawn } = await import('child_process')

    try {
      // Stream raw float32 PCM and capture first 512 samples (2048 bytes)
      const args = ['-i', inputPath, '-ac', '1', '-ar', '8000', '-f', 'f32le', '-']
      const child = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'ignore'] })

      const chunks: Buffer[] = []
      let total = 0
      const targetBytes = 512 * 4

      await new Promise<void>((resolve, reject) => {
        child.stdout.on('data', (chunk: Buffer) => {
          if (total >= targetBytes) {
            child.kill('SIGTERM')
            return
          }
          const remaining = targetBytes - total
          const toPush = chunk.length > remaining ? chunk.subarray(0, remaining) : chunk
          chunks.push(toPush)
          total += toPush.length
          if (total >= targetBytes) {
            child.kill('SIGTERM')
          }
        })
        child.on('error', reject)
        child.on('close', () => resolve())
      })

      const buffer = Buffer.concat(chunks)
      const samples: number[] = []
      for (let i = 0; i + 3 < buffer.length; i += 4) {
        samples.push(buffer.readFloatLE(i))
      }

      const maxSample = Math.max(1e-6, ...samples.map(Math.abs))
      const normalizedPeaks = samples.map(s => (s / maxSample) * 100)

      await fs.writeFile(peaksPath, JSON.stringify({ peaks: normalizedPeaks, length: samples.length }))
      console.log(`📊 Generated waveform: ${outputBaseName}.json`)
      return `peaks/${outputBaseName}.json`
    } catch (error) {
      console.warn(`⚠️  Waveform generation failed for ${outputBaseName}:`, error)
      return ''
    }
  }

  inferMetadata(filename: string): {
    title: string
    targetState: TargetState
    baseFreqHz?: number
    beatHz?: number
    tags: string[]
    description?: string
  } {
    const baseName = path.basename(filename, path.extname(filename))
    const lower = baseName.toLowerCase()

    // Extract frequency information
    const hzMatch = lower.match(/(\\d+(?:\\.\\d+)?)\\s*hz/)
    const beatHz = hzMatch ? parseFloat(hzMatch[1]) : undefined

    // Determine brainwave band and target state
    let targetState: TargetState = 'Custom'
    let baseFreqHz: number | undefined
    const tags: string[] = []

    if (beatHz) {
      if (beatHz >= 0.5 && beatHz <= 4) {
        targetState = 'Deep Sleep'
        baseFreqHz = 2
        tags.push('delta', 'deep sleep', 'recovery')
      } else if (beatHz > 4 && beatHz <= 8) {
        targetState = 'Lucid'
        baseFreqHz = 6
        tags.push('theta', 'meditation', 'creativity')
      } else if (beatHz > 8 && beatHz <= 12) {
        targetState = 'Calm'
        baseFreqHz = 10
        tags.push('alpha', 'relaxation', 'mindfulness')
      } else if (beatHz > 12 && beatHz <= 30) {
        targetState = 'Focus'
        baseFreqHz = 20
        tags.push('beta', 'concentration', 'alertness')
      } else if (beatHz > 30) {
        targetState = 'Focus'
        baseFreqHz = 40
        tags.push('gamma', 'insight', 'processing')
      }
    }

    // Additional context from filename
    if (lower.includes('sleep') || lower.includes('night')) {
      targetState = 'Deep Sleep'
      tags.push('sleep')
    } else if (lower.includes('focus') || lower.includes('study')) {
      targetState = 'Focus'
      tags.push('productivity')
    } else if (lower.includes('relax') || lower.includes('calm')) {
      targetState = 'Calm'
      tags.push('stress relief')
    } else if (lower.includes('meditation') || lower.includes('mindful')) {
      targetState = 'Lucid'
      tags.push('mindfulness')
    } else if (lower.includes('recovery') || lower.includes('healing')) {
      targetState = 'Recovery'
      tags.push('healing')
    }

    // Clean up title
    const title = baseName
      .replace(/_/g, ' ')
      .replace(/-/g, ' ')
      .replace(/\\b\\w/g, l => l.toUpperCase())
      .replace(/\\s+/g, ' ')
      .trim()

    const description = this.generateDescription(targetState, beatHz)

    return {
      title,
      targetState,
      baseFreqHz,
      beatHz,
      tags: [...new Set(tags)], // Remove duplicates
      description,
    }
  }

  private generateDescription(state: TargetState, beatHz?: number): string {
    const descriptions = {
      'Focus': 'Enhance concentration and mental clarity for productive work sessions.',
      'Deep Sleep': 'Promote deep, restorative sleep and natural recovery cycles.',
      'Lucid': 'Support meditation, creativity, and conscious awareness states.',
      'Calm': 'Reduce stress and anxiety while maintaining relaxed alertness.',
      'Recovery': 'Facilitate healing and restore physical and mental energy.',
      'Custom': 'Specialized frequency targeting for unique applications.',
    }

    let desc = descriptions[state]
    if (beatHz) {
      desc += ` Features ${beatHz}Hz binaural beats for optimal entrainment.`
    }

    return desc
  }

  async processAllTracks(): Promise<Track[]> {
    console.log('🎯 Starting track ingestion process...')
    
    this.driveFiles = await this.fetchFromDriveFolder()
    
    if (this.driveFiles.length === 0) {
      console.log('📭 No tracks found, creating empty manifest')
      return []
    }

    const tracks: Track[] = []
    let processed = 0

    for (const file of this.driveFiles) {
      try {
        processed++
        console.log(`\\n🎵 Processing ${processed}/${this.driveFiles.length}: ${file.name}`)

        // Download file
        const inputPath = await this.downloadFile(file)
        
        // Generate output basename
        const outputBaseName = path.basename(file.name, path.extname(file.name))
        
        // Transcode
        const { webmPath, aacPath, durationSec, gainDb } = await this.transcodeFile(inputPath, outputBaseName)
        
        // Generate waveform
        const peaksPath = await this.generateWaveformPeaks(inputPath, outputBaseName)
        
        // Infer metadata
        const metadata = this.inferMetadata(file.name)
        
        const track: Track = {
          id: file.id,
          title: metadata.title,
          filenameWebm: `${outputBaseName}.webm`,
          filenameAac: `${outputBaseName}.m4a`,
          durationSec,
          targetState: metadata.targetState,
          baseFreqHz: metadata.baseFreqHz,
          beatHz: metadata.beatHz,
          tags: metadata.tags,
          gainDb,
          description: metadata.description,
          peaksPath: peaksPath || undefined,
        }

        tracks.push(track)
        console.log(`✅ Completed: ${track.title} (${track.durationSec}s, ${track.targetState})`)
        
      } catch (error) {
        console.error(`❌ Failed to process ${file.name}:`, error)
      }
    }

    return tracks
  }

  async generateManifest(tracks: Track[]): Promise<void> {
    const manifest: TrackManifest = {
      tracks,
      lastUpdated: new Date().toISOString(),
      totalTracks: tracks.length,
    }

    const manifestPath = path.join(OUTPUT_DIR, 'tracks.json')
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2))
    
    console.log(`\\n📋 Generated manifest with ${tracks.length} tracks`)
    console.log(`📍 Saved to: ${manifestPath}`)
  }

  async cleanup(): Promise<void> {
    // Remove any stale output files that don't have corresponding tracks
    try {
      const outputFiles = await fs.readdir(OUTPUT_DIR)
      const validFiles = new Set(['tracks.json'])
      
      // Add current track files to valid set
      const manifest = JSON.parse(await fs.readFile(path.join(OUTPUT_DIR, 'tracks.json'), 'utf8'))
      for (const track of manifest.tracks) {
        validFiles.add(track.filenameWebm)
        validFiles.add(track.filenameAac)
      }

      for (const file of outputFiles) {
        if (!validFiles.has(file) && (file.endsWith('.webm') || file.endsWith('.m4a'))) {
          await fs.unlink(path.join(OUTPUT_DIR, file))
          console.log(`🗑️  Removed stale file: ${file}`)
        }
      }
    } catch (error) {
      console.warn('⚠️  Cleanup failed:', error)
    }
  }
}

async function main() {
  const fetcher = new TrackFetcher()
  
  try {
    await fetcher.init()
    const tracks = await fetcher.processAllTracks()
    await fetcher.generateManifest(tracks)
    await fetcher.cleanup()
    
    console.log('\\n🎉 Track ingestion complete!')
    
    if (tracks.length === 0) {
      console.warn('\\n⚠️  Warning: No tracks were processed. Check your configuration:')
      console.warn('   - DRIVE_FOLDER_URL is set correctly')
      console.warn('   - Folder contains audio files (.mp3, .wav, .flac, .m4a)')
      console.warn('   - Folder is publicly accessible OR GOOGLE_API_KEY is provided')
    }
    
  } catch (error) {
    console.error('\\n💥 Fatal error:', error)
    process.exit(1)
  }
}

if (require.main === module) {
  // Skip fetching/transcoding on CI/Vercel environments where FFmpeg isn't available
  if (process.env.CI || process.env.VERCEL) {
    console.log('⏭️  Skipping track fetch on CI/Vercel environment')
    process.exit(0)
  }
  main()
}

export { TrackFetcher }