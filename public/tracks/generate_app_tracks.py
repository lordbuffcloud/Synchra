#!/usr/bin/env python3
"""
Generate Nice Tracks for Synchra App
====================================

This script generates a collection of high-quality binaural beats tracks
optimized for the Synchra app with various use cases.
"""

from advanced_binaural_generator import AdvancedBinauralGenerator
import json
import os

def generate_app_tracks():
    """Generate a complete collection of tracks for the Synchra app."""
    generator = AdvancedBinauralGenerator()
    
    # Define track collection
    tracks = [
        {
            "name": "deep_focus_6hz_30min",
            "title": "Deep Focus Session", 
            "duration": 30,
            "theta": 6.0,
            "description": "Intense concentration and deep work - optimal theta frequency for sustained focus"
        },

    ]
    
    all_manifests = []
    
    print("Generating Synchra App Track Collection...")
    print("=" * 50)
    
    for i, track in enumerate(tracks, 1):
        print(f"\nCreating Track {i}/5: {track['title']}...")
        print(f"   Duration: {track['duration']} minutes")
        print(f"   Frequency: {track['theta']} Hz")
        
        try:
            webm, m4a, manifest = generator.generate_advanced_track(
                duration_min=track['duration'],
                theta_freq=track['theta'], 
                output_stem=track['name']
            )
            
            # Add metadata to manifest
            manifest['title'] = track['title']
            manifest['description'] = track['description']
            manifest['category'] = get_category(track['theta'])
            manifest['webm_file'] = webm
            manifest['m4a_file'] = m4a
            
            all_manifests.append(manifest)
            
            print(f"   Generated: {webm}")
            print(f"   Generated: {m4a}")
            print(f"   Beat frequency: {track['theta']} Hz")
            
        except Exception as e:
            print(f"   Error generating {track['name']}: {e}")
            continue
    
    # Save combined app manifest
    app_manifest = {
        "app_name": "Synchra",
        "collection_name": "Premium Binaural Beats Collection",
        "version": "1.0",
        "description": "Advanced neuroacoustic tracks with theta-gamma coupling, Schumann anchoring, and cutting-edge binaural processing",
        "features": [
            "True theta focus frequencies (4-7.83 Hz)",
            "7.83 Hz Schumann resonance anchoring", 
            "Theta-Gamma cross-frequency coupling",
            "HRV breath-synchronized envelopes",
            "Micro-ITD phase drift for spaciousness",
            "Spindle-bridge memory enhancement", 
            "Hemi-alternator attention refresh",
            "Gapless phase-coherent rendering",
            "Dual codec output (WebM/Opus + M4A/AAC)"
        ],
        "total_tracks": len(all_manifests),
        "total_duration_minutes": sum(track['duration'] for track in tracks),
        "tracks": all_manifests
    }
    
    with open("synchra_app_manifest.json", "w") as f:
        json.dump(app_manifest, f, indent=2)
    
    print(f"\nSynchra App Collection Complete!")
    print(f"Generated {len(all_manifests)} tracks")
    print(f"Total duration: {app_manifest['total_duration_minutes']} minutes")
    print(f"App Manifest: synchra_app_manifest.json")
    
    # Create individual manifests for each track
    for manifest in all_manifests:
        track_name = manifest['parameters']['output_stem']
        with open(f"{track_name}_manifest.json", "w") as f:
            json.dump(manifest, f, indent=2)
    
    return all_manifests

def get_category(freq):
    """Categorize tracks by frequency range."""
    if freq <= 4.0:
        return "meditation"
    elif freq <= 6.0:
        return "deep_focus"
    elif freq <= 7.0:
        return "creative_flow"
    elif freq <= 8.0:
        return "alert_focus"
    else:
        return "high_frequency"

if __name__ == "__main__":
    generate_app_tracks()