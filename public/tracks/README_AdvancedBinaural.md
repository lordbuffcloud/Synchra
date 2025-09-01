# 🚀 Advanced Binaural Beats Generator

**Cutting-edge neuroacoustic binaural beats with advanced psychoacoustic features**

## ✨ Features

### Core Neuroacoustic Technologies

- **🧠 True 6–8 Hz Theta Focus** - Optimal theta range for deep concentration and vivid imagery
- **⚡ 7.83 Hz Schumann Anchoring** - Earth's resonant frequency for natural grounding  
- **🔗 Theta↔Gamma Cross-Frequency Coupling** - 6 Hz core with 40 Hz overlays for alert imagery
- **🫁 HRV 0.1 Hz Breath Coupling** - Amplitude envelopes matching parasympathetic breathing
- **🌊 Micro-ITD Phase Drift** - Sub-millisecond timing variations for natural spaciousness
- **🔄 Spindle-Bridge 13 Hz Modulation** - Memory consolidation enhancement via sleep spindle frequencies
- **🔀 Hemi-Alternator Patterns** - Lateral attention refresh without hemispheric fatigue
- **⚡ Gapless Phase-Coherent Rendering** - No clicks, no zipper noise, seamless loop points
- **📦 Dual Codec Output** - WebM/Opus (most browsers) + M4A/AAC (iOS/Safari compatibility)

### Advanced Audio Processing

- **Pink Noise Bed** - Natural masking and acoustic texture
- **Equal-Power Crossfades** - Smooth transitions and phase coherence  
- **Multi-Layer Amplitude Modulation** - Sophisticated envelope shaping
- **Precise Phase Management** - Eliminates artifacts and ensures continuity
- **Professional Normalization** - Optimized levels with headroom protection

## 🎯 Quick Start

### Generate a Single Track

```bash
python advanced_binaural_generator.py --duration 45 --theta 6.0 --output my_focus_track
```

### Generate Multiple Variants (Batch Mode)

```bash
python advanced_binaural_generator.py --batch
```

This creates tracks at multiple theta frequencies (6.0, 6.5, 7.0, 7.5, 8.0 Hz) and durations (30, 45, 60 minutes).

### Using the Example Scripts

```bash
# Generate a focus session with multiple tracks
python example_usage.py focus-session

# Create a custom single track  
python example_usage.py custom

# Test all features
python example_usage.py test

# Show feature summary
python example_usage.py features
```

## 🔧 Requirements

### System Dependencies
- **Python 3.7+** with NumPy
- **FFmpeg** - For audio encoding (WebM/Opus and M4A/AAC output)
- **SciPy** (optional) - For enhanced pink noise generation

### Installation

```bash
# Install Python dependencies
pip install numpy scipy

# Install FFmpeg (Windows)
# Download from https://ffmpeg.org/download.html
# Add to PATH

# Install FFmpeg (macOS)  
brew install ffmpeg

# Install FFmpeg (Ubuntu/Debian)
sudo apt update && sudo apt install ffmpeg
```

## 🎵 Generated Track Specifications

- **Sample Rate:** 44.1 kHz (CD quality)
- **Bit Depth:** 16-bit PCM (WAV), compressed (WebM/M4A)
- **Channels:** Stereo (essential for binaural effect)
- **Formats:** WebM (Opus 160 kbps), M4A (AAC 192 kbps)
- **Peak Level:** -3 dBFS (safe headroom)

## 🧪 Technical Details

### Theta-Gamma Cross-Frequency Coupling

The generator implements sophisticated theta-gamma coupling by:
1. Generating core 6 Hz theta binaural beat
2. Adding 40 Hz gamma-frequency amplitude modulation
3. Carefully balancing coupling depth (8%) to avoid harshness
4. Maintaining phase coherence across all frequency components

### HRV Breath Coupling

Heart Rate Variability (HRV) breathing patterns are embedded via:
- **0.1 Hz envelope modulation** matching optimal parasympathetic breathing
- **85-100% amplitude range** for subtle but effective coupling
- **Sine wave envelope** for smooth, natural breathing rhythm

### Micro-ITD Phase Drift

Interaural Time Differences create spaciousness through:
- **Sub-millisecond delays** (0.5ms maximum)  
- **Ultra-slow drift rate** (0.003 Hz, ~5.5 minute cycles)
- **Right channel delay modulation** for natural lateral movement
- **Preservation of core binaural beat integrity**

### Hemi-Alternator System

Prevents hemispheric fatigue via:
- **10-second alternation cycles** between ear dominance
- **2-second smooth transitions** to avoid jarring switches  
- **60% attenuation** of non-dominant ear (maintains binaural effect)
- **Equal time distribution** between left/right dominance phases

## 📊 Output Manifests

Each generated track includes a JSON manifest with metadata:

```json
{
  "id": "advanced-theta-focus-6hz",
  "title": "Advanced Theta Focus 6.0 Hz", 
  "filenameWebm": "advanced_theta_6Hz_45min.webm",
  "filenameAac": "advanced_theta_6Hz_45min.m4a",
  "durationSec": 2700,
  "beatHz": 6.0,
  "tags": ["binaural beats", "theta", "advanced", "schumann", "gamma coupling"],
  "description": "Cutting-edge 6.0 Hz theta focus with Schumann anchoring...",
  "gainDb": 0
}
```

## 🎧 Usage Recommendations

### Optimal Listening Conditions
- **Stereo headphones required** (binaural effect needs isolated channels)
- **Comfortable volume** (should be audible but not prominent) 
- **Quiet environment** for best entrainment effect
- **Consistent listening position** to maintain stereo imaging

### Session Recommendations  
- **Start with 30-45 minutes** for new users
- **6-7 Hz range** optimal for focus and imagery
- **7.83 Hz** for grounding and natural rhythm
- **Combine with meditation, study, or creative work**

### Safety Notes
- **Not recommended** for individuals with epilepsy or seizure disorders
- **Lower volume** if experiencing discomfort or headaches  
- **Take breaks** during extended listening sessions
- **Discontinue use** if any adverse effects occur

## 🔬 Scientific Background

This generator incorporates research-backed neuroacoustic principles:

- **Theta Entrainment** - 6-8 Hz range promotes deep focus and imagery (Cantero & Atienza, 2005)
- **Schumann Resonance** - 7.83 Hz matches Earth's electromagnetic frequency (König et al., 1981)
- **Cross-Frequency Coupling** - Theta-gamma interaction supports cognitive flexibility (Canolty et al., 2006)
- **HRV Coherence** - 0.1 Hz breathing optimizes autonomic balance (McCraty & Shaffer, 2015)
- **Interaural Processing** - Microsecond-level ITD creates spatial perception (Moore, 2012)

## 📈 Advanced Customization

### Custom Frequency Profiles

Modify the generator for specific applications:

```python
# Deep meditation variant
webm, m4a, manifest = generator.generate_advanced_track(
    duration_min=60,
    theta_freq=4.5,  # Deeper theta
    output_stem="deep_meditation"
)

# Creative flow variant  
webm, m4a, manifest = generator.generate_advanced_track(
    duration_min=45,
    theta_freq=7.5,  # Higher theta
    output_stem="creative_flow"
)
```

### Parameter Tuning

Key parameters can be adjusted in the source:
- `gamma_freq=40.0` - Gamma coupling frequency  
- `coupling_depth=0.08` - Theta-gamma coupling strength
- `hrv_freq=0.1` - Breathing envelope rate
- `drift_rate=0.003` - ITD drift speed
- `swap_interval=10.0` - Hemi-alternator timing

## 🤝 Contributing

This advanced binaural generator represents cutting-edge neuroacoustic research. Contributions welcome for:

- Additional entrainment frequencies
- Enhanced psychoacoustic algorithms  
- Validation studies and measurements
- Platform-specific optimizations
- New neuroacoustic feature implementations

## 📚 References

- Cantero, J. L., & Atienza, M. (2005). The role of neural synchronization in the emergence of cognition across the wake-sleep cycle. *Reviews in the Neurosciences*, 16(1), 69-83.
- Canolty, R. T., et al. (2006). High gamma power is phase-locked to theta oscillations in human neocortex. *Science*, 313(5793), 1626-1628.
- König, H. L., et al. (1981). *Bioinformation - Electrophysical Aspects*. Urban & Schwarzenberg.
- McCraty, R., & Shaffer, F. (2015). Heart rate variability: new perspectives on physiological mechanisms. *Frontiers in Physiology*, 6, 55.
- Moore, B. C. (2012). *An Introduction to the Psychology of Hearing*. Brill.

---

**🎵 Ready to experience next-generation binaural beats? Generate your first advanced track today!**