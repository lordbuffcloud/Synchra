#!/usr/bin/env tsx

import * as fs from 'fs/promises'
import * as path from 'path'

async function checkTracksManifest() {
  const manifestPath = path.join('public', 'tracks', 'tracks.json')
  
  try {
    const manifestContent = await fs.readFile(manifestPath, 'utf8')
    const manifest = JSON.parse(manifestContent)
    
    if (!manifest.tracks || manifest.tracks.length === 0) {
      const msg = '❌ Build check: No tracks found in manifest'
      if (process.env.CI || process.env.VERCEL) {
        console.warn(msg)
        return
      }
      console.error(msg)
      console.error('   Run `npm run prepare` to fetch and process tracks')
      process.exit(1)
    }
    
    console.log(`✅ Build check passed: ${manifest.tracks.length} tracks available`)
    
    // Verify track files exist
    let missingFiles = 0
    for (const track of manifest.tracks) {
      const webmPath = path.join('public', 'tracks', track.filenameWebm)
      const aacPath = path.join('public', 'tracks', track.filenameAac)
      
      try {
        if (!track.remoteWebmUrl) await fs.access(webmPath)
      } catch {
        console.error(`❌ Missing file: ${track.filenameWebm}`)
        missingFiles++
      }
      
      try {
        if (!track.remoteAacUrl) await fs.access(aacPath)
      } catch {
        console.error(`❌ Missing file: ${track.filenameAac}`)
        missingFiles++
      }
    }
    
    if (missingFiles > 0) {
      const msg = `❌ Build check: ${missingFiles} track files are missing`
      if (process.env.CI || process.env.VERCEL) {
        console.warn(msg)
        return
      }
      console.error(msg)
      console.error('   Run `npm run prepare` to regenerate missing files')
      process.exit(1)
    }
    
    console.log('✅ All track files verified')
    
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      const msg = '❌ Build check: tracks manifest not found'
      if (process.env.CI || process.env.VERCEL) {
        console.warn(msg)
        return
      }
      console.error(msg)
      console.error('   Run `npm run prepare` to fetch and process tracks before building')
    } else {
      const msg = '❌ Build check: Invalid tracks manifest'
      if (process.env.CI || process.env.VERCEL) {
        console.warn(msg, 'Error:', (error as Error).message)
        return
      }
      console.error(msg)
      console.error('   Error:', (error as Error).message)
    }
    process.exit(1)
  }
}

if (require.main === module) {
  checkTracksManifest()
}