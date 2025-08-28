#!/usr/bin/env tsx

import * as fs from 'fs/promises'
import * as path from 'path'

async function checkTracksManifest() {
  const manifestPath = path.join('public', 'tracks', 'tracks.json')
  
  try {
    const manifestContent = await fs.readFile(manifestPath, 'utf8')
    const manifest = JSON.parse(manifestContent)
    
    if (!manifest.tracks || manifest.tracks.length === 0) {
      console.error('❌ Build failed: No tracks found in manifest')
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
        await fs.access(webmPath)
      } catch {
        console.error(`❌ Missing file: ${track.filenameWebm}`)
        missingFiles++
      }
      
      try {
        await fs.access(aacPath)
      } catch {
        console.error(`❌ Missing file: ${track.filenameAac}`)
        missingFiles++
      }
    }
    
    if (missingFiles > 0) {
      console.error(`❌ Build failed: ${missingFiles} track files are missing`)
      console.error('   Run `npm run prepare` to regenerate missing files')
      process.exit(1)
    }
    
    console.log('✅ All track files verified')
    
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      console.error('❌ Build failed: tracks manifest not found')
      console.error('   Run `npm run prepare` to fetch and process tracks before building')
    } else {
      console.error('❌ Build failed: Invalid tracks manifest')
      console.error('   Error:', (error as Error).message)
    }
    process.exit(1)
  }
}

if (require.main === module) {
  checkTracksManifest()
}