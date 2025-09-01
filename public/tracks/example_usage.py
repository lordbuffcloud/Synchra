#!/usr/bin/env python3
"""
Example Usage for Advanced Binaural Beats Generator
==================================================

This file demonstrates how to use the advanced binaural beats generator
to create cutting-edge neuroacoustic tracks with all features.
"""

from advanced_binaural_generator import AdvancedBinauralGenerator
import json
import os

def generate_focus_session():
    """Generate a complete focus session with multiple tracks."""
    generator = AdvancedBinauralGenerator()
    
    # Create focus session tracks
    tracks = [
        {"name": "deep_focus_6hz_45min", "duration": 45, "theta": 6.0},
        {"name": "alert_focus_7hz_30min", "duration": 30, "theta": 7.0}, 
        {"name": "creative_flow_6p5hz_60min", "duration": 60, "theta": 6.5},
        {"name": "schumann_anchor_7p83hz_45min", "duration": 45, "theta": 7.83}
    ]
    
    all_manifests = []
    
    print("🎵 Generating Advanced Focus Session...")
    print("=" * 50)
    
    for track in tracks:
        print(f"\n🎯 Creating {track['name']}...")
        webm, m4a, manifest = generator.generate_advanced_track(
            duration_min=track['duration'],
            theta_freq=track['theta'], 
            output_stem=track['name']
        )
        all_manifests.append(manifest)
        print(f"   ✅ Generated: {webm}")
        print(f"   ✅ Generated: {m4a}")
    
    # Save combined manifest
    manifest_data = {
        "session_name": "Advanced Focus Session",
        "description": "Cutting-edge binaural beats with theta-gamma coupling, Schumann anchoring, and neuroacoustic enhancements",
        "tracks": all_manifests
    }
    
    with open("focus_session_manifest.json", "w") as f:
        json.dump(manifest_data, f, indent=2)
    
    print(f"\n🎉 Focus Session Complete!")
    print(f"📁 Generated {len(all_manifests)} tracks")
    print(f"📄 Manifest: focus_session_manifest.json")
    
    return all_manifests

def generate_custom_track():
    """Generate a single custom track with specific parameters."""
    generator = AdvancedBinauralGenerator()
    
    print("🎵 Generating Custom Advanced Track...")
    print("=" * 40)
    
    # Custom parameters
    duration = 45  # minutes
    theta_freq = 6.5  # Hz
    output_name = "custom_theta_focus"
    
    webm, m4a, manifest = generator.generate_advanced_track(
        duration_min=duration,
        theta_freq=theta_freq,
        output_stem=output_name
    )
    
    print(f"\n✅ Custom track generated:")
    print(f"   🎵 WebM: {webm}")
    print(f"   🎵 M4A: {m4a}")
    print(f"   📊 Beat frequency: {theta_freq} Hz")
    print(f"   ⏱️  Duration: {duration} minutes")
    
    # Save manifest
    with open(f"{output_name}_manifest.json", "w") as f:
        json.dump(manifest, f, indent=2)
    
    print(f"   📄 Manifest: {output_name}_manifest.json")
    
    return webm, m4a, manifest

def test_features():
    """Test individual features of the generator."""
    import numpy as np
    
    print("🧪 Testing Individual Features...")
    print("=" * 35)
    
    generator = AdvancedBinauralGenerator()
    duration_min = 1  # Short test duration
    
    # Generate test signals
    left, right, t = generator.generate_theta_schumann_core(duration_min, theta_freq=6.0)
    
    print("✅ Core theta + Schumann generation")
    print(f"   📊 Signal length: {len(left)} samples")
    print(f"   📊 Duration: {len(left) / generator.sr:.2f} seconds")
    
    # Test each enhancement
    left, right = generator.add_theta_gamma_coupling(left, right, t)
    print("✅ Theta↔Gamma coupling added")
    
    left, right = generator.add_hrv_envelope(left, right, t)
    print("✅ HRV breathing envelope added")
    
    left, right = generator.add_micro_itd_drift(left, right, t)
    print("✅ Micro-ITD phase drift added")
    
    left, right = generator.add_spindle_bridge(left, right, t)
    print("✅ Spindle-bridge modulation added")
    
    left, right = generator.add_hemi_alternator(left, right, t)
    print("✅ Hemi-alternator patterns added")
    
    left, right = generator.add_pink_noise_bed(left, right)
    print("✅ Pink noise bed added")
    
    left, right = generator.ensure_phase_coherence(left, right)
    print("✅ Phase coherence ensured")
    
    left, right = generator.normalize_audio(left, right)
    print("✅ Audio normalized")
    
    # Calculate some basic stats
    peak_left = np.max(np.abs(left))
    peak_right = np.max(np.abs(right))
    rms_left = np.sqrt(np.mean(left**2))
    rms_right = np.sqrt(np.mean(right**2))
    
    print(f"\n📈 Audio Statistics:")
    print(f"   🔊 Left peak: {peak_left:.3f}")
    print(f"   🔊 Right peak: {peak_right:.3f}")  
    print(f"   📊 Left RMS: {rms_left:.3f}")
    print(f"   📊 Right RMS: {rms_right:.3f}")
    
    print("\n🎉 All features tested successfully!")

def show_feature_summary():
    """Display a summary of all implemented features."""
    print("🚀 Advanced Binaural Beats Generator")
    print("=" * 40)
    print("🎯 CUTTING-EDGE NEUROACOUSTIC FEATURES:")
    print()
    print("1. 🧠 True 6–8 Hz theta focus")
    print("   └─ Optimal for deep concentration and imagery")
    print()
    print("2. ⚡ 7.83 Hz Schumann anchoring")
    print("   └─ Earth's resonant frequency for grounding")
    print()  
    print("3. 🔗 Theta↔Gamma Cross-Frequency Coupling")
    print("   └─ 6 Hz core with 40 Hz overlays for alert imagery")
    print()
    print("4. 🫁 HRV 0.1 Hz breath-coupled envelopes") 
    print("   └─ Matches parasympathetic breathing rhythm")
    print()
    print("5. 🌊 Micro-ITD phase drift (sub-millisecond)")
    print("   └─ Natural spaciousness without artifacts")
    print()
    print("6. 🔄 Spindle-bridge 13 Hz modulation")
    print("   └─ Memory consolidation enhancement")
    print()
    print("7. 🔀 Hemi-alternator patterns")
    print("   └─ Lateral attention refresh without fatigue")
    print()
    print("8. ⚡ Gapless, phase-coherent rendering")
    print("   └─ No clicks, no zipper noise, seamless loops")
    print()
    print("9. 📦 Dual codec output")
    print("   └─ WebM/Opus (browsers) + M4A/AAC (iOS/Safari)")
    print()
    print("🎵 Ready to generate your advanced binaural experience!")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        command = sys.argv[1]
        
        if command == "focus-session":
            generate_focus_session()
        elif command == "custom":
            generate_custom_track()
        elif command == "test":
            test_features()
        elif command == "features":
            show_feature_summary()
        else:
            print(f"Unknown command: {command}")
            print("Available commands: focus-session, custom, test, features")
    else:
        # Default: show features and generate a sample
        show_feature_summary()
        print("\n" + "="*50)
        print("🎬 Generating sample track...")
        generate_custom_track()