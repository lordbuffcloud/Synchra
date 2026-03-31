#!/usr/bin/env python3
"""
build_ap_guided.py  --  Astral Projection Guided Meditation Builder
====================================================================

Generates 3 guided astral projection meditation tracks:
  AP01 - First Gateway       (~15 min)  Beginner theta descent
  AP02 - Vibration State     (~25 min)  Intermediate vibration induction
  AP03 - Full Exit Protocol  (~35 min)  Advanced Monroe Focus 10->12->15

Pipeline per track:
  1. Generate binaural beat background (theta/delta progression) via numpy
  2. Synthesise narration via ElevenLabs TTS (streaming)
  3. Insert calibrated silence gaps between narration segments
  4. Mix narration over binaural bed with sidechain ducking
  5. Encode to WebM/Opus + M4A/AAC
  6. Emit manifest patch JSON

Requirements:
  - Python 3.10+, numpy, requests
  - FFmpeg (path auto-detected or set FFMPEG_PATH env var)
  - ELEVEN_API_KEY environment variable

Usage:
  set ELEVEN_API_KEY=<your key>
  python build_ap_guided.py
"""

import os, sys, json, subprocess, tempfile, pathlib, math, wave, struct
import numpy as np

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
SR = 44100
PI2 = 2.0 * math.pi

# ElevenLabs
API_STREAM = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream"
API_KEY = os.getenv("ELEVEN_API_KEY")

# Voice: "Adam" deep calm male (fallback to env ELEVEN_VOICE_ID)
VOICE_ID = os.getenv("ELEVEN_VOICE_ID", "pNInz6obpgDQGcFmaJgB")

# TTS model -- multilingual v2 for highest quality
TTS_MODEL = "eleven_multilingual_v2"

# TTS voice settings tuned for guided meditation (very stable, calm)
TTS_SETTINGS = {
    "stability": 0.78,
    "similarity_boost": 0.50,
    "style": 0.05,
    "use_speaker_boost": True,
}

# FFmpeg path
FFMPEG = os.getenv("FFMPEG_PATH",
    r"C:\Users\lordb\AppData\Local\Microsoft\WinGet\Packages"
    r"\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe"
    r"\ffmpeg-8.1-full_build\bin\ffmpeg.exe")
FFPROBE = FFMPEG.replace("ffmpeg.exe", "ffprobe.exe")
FFERR = ["-hide_banner", "-loglevel", "error"]

# Output directory (same as other tracks)
OUT_DIR = pathlib.Path(__file__).resolve().parent

# ---------------------------------------------------------------------------
# Meditation Scripts
# ---------------------------------------------------------------------------
# Each entry: {"text": "narration", "pause_after": seconds}
# The pause_after value creates silence after the narration segment.

AP01_SCRIPT = [
    # ---- Intro & Settling (0:00 - 2:00) ----
    {"text": "Welcome. Find a comfortable position lying on your back. Let your arms rest at your sides, palms facing up. Close your eyes and take a slow, deep breath in through your nose.", "pause_after": 6},
    {"text": "Exhale slowly through your mouth, releasing all tension. With each breath, you are telling your body it is safe to let go. Safe to relax completely.", "pause_after": 8},
    {"text": "The gentle tones you hear are tuned to guide your brainwaves into the theta range, the borderland between waking and sleep. You don't need to do anything with them. Simply allow them to wash through you.", "pause_after": 10},

    # ---- Progressive Relaxation (2:00 - 5:00) ----
    {"text": "Bring your attention to the top of your head. Imagine a warm, golden light beginning to form there. This light is pure relaxation. Feel it softening your scalp, releasing your forehead, smoothing the muscles around your eyes.", "pause_after": 8},
    {"text": "Let the warmth flow down through your jaw. Release any clenching. Let your tongue rest gently. Feel your neck muscles unwinding, layer by layer.", "pause_after": 8},
    {"text": "The golden light pours through your shoulders, dissolving knots of tension. It flows down both arms simultaneously, warming your elbows, your wrists, pooling softly in your open palms.", "pause_after": 8},
    {"text": "Now the warmth spreads through your chest. Your breathing becomes effortless. Your heartbeat steady and calm. Feel the relaxation flowing through your abdomen, your lower back releasing completely.", "pause_after": 8},
    {"text": "The light continues through your hips, down through your thighs. Your knees relax. Your calves become heavy and warm. The golden glow fills your feet, and spills out through your toes.", "pause_after": 10},

    # ---- Theta Descent (5:00 - 9:00) ----
    {"text": "Your entire body is now wrapped in warmth. Begin to notice how your body feels against the surface beneath you. Notice the weight. The heaviness. Your body is becoming beautifully, pleasantly heavy.", "pause_after": 12},
    {"text": "With each breath, you sink a little deeper. Not into sleep, but into a state of expanded awareness. Your mind remains clear, alert, like a calm lake reflecting a still sky. But your body grows heavier, more distant.", "pause_after": 15},
    {"text": "You are entering what is known as the mind-awake, body-asleep state. There is nothing you need to force. Simply observe. Simply breathe. Let the tones carry you.", "pause_after": 15},

    # ---- Body Awareness Dissolution (9:00 - 12:30) ----
    {"text": "Now begin to notice something interesting. The boundaries of your body are starting to soften. The edges where you end and the space around you begins are becoming less defined.", "pause_after": 12},
    {"text": "Imagine your awareness expanding outward, like ripples on water. You can still feel your body, but it is becoming more like an echo, a memory of shape rather than solid form.", "pause_after": 15},
    {"text": "If you feel any tingling, any subtle vibrations, any sense of floating, these are natural signs. Welcome them. They mean your awareness is shifting exactly as it should.", "pause_after": 15},
    {"text": "Simply rest here in this expanded state. There is nowhere to go, nothing to achieve. Just be.", "pause_after": 20},

    # ---- Return (12:30 - 15:00) ----
    {"text": "When you are ready, gently bring your awareness back to your breath. Feel the air moving in and out. Begin to notice the weight of your body again. The solidity of the surface beneath you.", "pause_after": 10},
    {"text": "Slowly wiggle your fingers and toes. Roll your wrists and ankles gently. Take a deep, refreshing breath.", "pause_after": 8},
    {"text": "Remember what you experienced. The sensations, the expansiveness, the stillness. This state is always available to you. You can return any time.", "pause_after": 6},
    {"text": "When you feel ready, open your eyes. Welcome back.", "pause_after": 10},
]

AP02_SCRIPT = [
    # ---- Opening & Intent Setting (0:00 - 2:30) ----
    {"text": "Welcome to the Vibration State meditation. Lie down in a comfortable position. This session will guide you deeper than before, into the vibrational frequency that precedes separation of awareness from the physical body.", "pause_after": 8},
    {"text": "Set your intention now. Silently say to yourself: I will remain conscious as my body falls asleep. I will notice and welcome the vibrations when they arrive.", "pause_after": 10},
    {"text": "Take three deep breaths. In through the nose, out through the mouth. Each exhale carries away tension, doubt, and expectation.", "pause_after": 12},

    # ---- Deep Body Scan (2:30 - 7:00) ----
    {"text": "Begin a slow scan from the crown of your head downward. As you focus on each area, mentally command it to relax. Feel your scalp softening. Your forehead smoothing. The tiny muscles around your eyes releasing completely.", "pause_after": 8},
    {"text": "Your jaw unclenches. Your tongue floats. Your throat opens. Feel the relaxation cascade through your neck, vertebra by vertebra.", "pause_after": 8},
    {"text": "Your shoulders drop away from your ears. Feel the space that opens up. Your arms grow heavy, warm, pleasantly numb. Your fingers rest motionless.", "pause_after": 8},
    {"text": "Your chest rises and falls on its own now. You are no longer controlling your breath, only observing it. Your stomach softens. Your lower back releases into the surface beneath you.", "pause_after": 8},
    {"text": "Your hips settle deeper. Your thighs become dense and immovable. Your knees, your shins, your ankles, all dissolving into warm heaviness.", "pause_after": 8},
    {"text": "Your feet are the last to let go. Feel them relax completely. Your entire body is now a landscape of deep stillness.", "pause_after": 12},

    # ---- Energy Body Activation (7:00 - 12:00) ----
    {"text": "Now shift your attention inward. Imagine a sphere of energy resting at the base of your spine. It pulses with a soft, warm light, synchronized to the binaural tones you hear.", "pause_after": 10},
    {"text": "With each breath, this energy begins to rise. Feel it climbing along your spine. Not rushing. Flowing. Like warm honey ascending through the center of your being.", "pause_after": 12},
    {"text": "As the energy reaches your chest, it begins to spread outward. Filling your torso with a gentle buzzing, a subtle electrical hum. This is the beginning of the vibrational state.", "pause_after": 12},
    {"text": "The energy continues to your throat, your head. Your entire body now hums with a fine vibration. If you can feel this, even slightly, focus on it. If not, simply imagine it. Imagination and reality share the same neural pathways.", "pause_after": 15},
    {"text": "Now amplify the vibration. Breathe into it. With each inhale, the frequency increases slightly. The buzzing becomes more defined, more present. You are tuning your awareness to a finer frequency.", "pause_after": 15},

    # ---- Vibration Intensification (12:00 - 17:00) ----
    {"text": "The vibrations may feel like electricity, like a low hum, like the feeling right before a sneeze that never comes. Whatever form they take, welcome them without analysis.", "pause_after": 12},
    {"text": "Now imagine the vibrations increasing in speed. Faster, finer, higher in pitch. Like a tuning fork being struck with increasing force. Your body may feel as though it is dissolving into pure frequency.", "pause_after": 15},
    {"text": "You may notice your heartbeat quicken slightly. This is normal. It is your nervous system recognizing the shift. Breathe slowly and reassure yourself: this is safe, this is natural, I am in control.", "pause_after": 12},
    {"text": "Allow the vibrations to reach their peak. Hold them there. You are now at the threshold. The membrane between physical and non-physical awareness is at its thinnest.", "pause_after": 20},

    # ---- Separation Attempt (17:00 - 22:00) ----
    {"text": "From this vibrational state, we will now attempt a gentle separation. Imagine a rope hanging above you, just within reach. Do not visualize your hands reaching for it. Instead, feel your awareness reaching upward, as though your inner self is extending toward it.", "pause_after": 15},
    {"text": "Pull yourself upward, hand over hand, using only your imagination. Feel the sensation of rising, of lightness, of your awareness beginning to lift away from your physical form. Do not force it. Simply intend it.", "pause_after": 20},
    {"text": "If you feel resistance, that is normal. Breathe, relax deeper, and try again. Each attempt strengthens the neural pathways of separation. Even partial lifting is profound progress.", "pause_after": 15},
    {"text": "If you achieve any degree of separation, whether floating, rolling, or simply a shift in perspective, stabilize by rubbing your imagined hands together. Feel the friction, the realness of this new position.", "pause_after": 20},

    # ---- Return & Integration (22:00 - 25:00) ----
    {"text": "Now, gently, allow yourself to settle back into your body. Feel the weight of your physical form returning. The vibrations slowing. Your breathing becoming more normal.", "pause_after": 12},
    {"text": "Take a deep breath and feel the air fill your lungs. Wiggle your fingers. Roll your shoulders. Feel the solid surface beneath you.", "pause_after": 8},
    {"text": "Whatever you experienced, whether full separation, partial lifting, vibrations, or deep relaxation, is valuable. Each session builds upon the last. Record your experience as soon as possible.", "pause_after": 6},
    {"text": "Take one more deep breath. Open your eyes when you are ready. Welcome back.", "pause_after": 10},
]

AP03_SCRIPT = [
    # ---- Opening Protocol (0:00 - 3:00) ----
    {"text": "Welcome to the Full Exit Protocol. This is an advanced session based on the Focus level system developed for consciousness exploration. You will progress through three states: Focus Ten, Focus Twelve, and Focus Fifteen. Each represents a deeper expansion of awareness beyond the physical body.", "pause_after": 10},
    {"text": "Lie on your back with arms at your sides. If you wish, place a light blanket over yourself for warmth. Ensure you will not be disturbed for the next thirty-five minutes.", "pause_after": 8},
    {"text": "Set your intention clearly. State silently: I am more than my physical body. I will maintain full consciousness as I explore states beyond the physical. I will remember everything I experience.", "pause_after": 12},
    {"text": "Begin your preparatory breathing. Inhale deeply for a count of four. Hold for four. Exhale for eight. This ratio activates your parasympathetic nervous system and signals to your body that sleep is approaching, while your mind remains alert.", "pause_after": 15},

    # ---- Resonant Tuning (3:00 - 6:00) ----
    {"text": "Now we begin resonant tuning. As you breathe in, imagine drawing energy up from beneath you, from the earth itself, through the soles of your feet, up through your body, and out through the top of your head.", "pause_after": 10},
    {"text": "On each exhale, hum a low, steady tone. Match the resonance you feel in your chest. This hum creates a vibratory alignment between your physical and energy bodies. Do this for several breaths.", "pause_after": 20},
    {"text": "Now imagine enclosing yourself in a protective energy field. Visualize a glowing sphere of light surrounding your entire body, extending about an arm's length in every direction. This is your resonant energy balloon. It contains and focuses your awareness.", "pause_after": 12},

    # ---- Focus 10: Mind Awake, Body Asleep (6:00 - 14:00) ----
    {"text": "We now begin the descent to Focus Ten. Focus Ten is the state where your mind is fully awake while your body is completely asleep. Think of a number ten and place it on your mental screen.", "pause_after": 10},
    {"text": "Starting with your feet. Gather all the tension, all the sensation, all the feeling in your left foot. Imagine placing it into a small energy box. Close the lid. Your left foot is now empty of sensation.", "pause_after": 10},
    {"text": "Do the same with your right foot. Gather, box, close. Your feet are now peacefully absent from your awareness.", "pause_after": 10},
    {"text": "Move to your calves. Both at once. Gather the sensation. Place it in the box. Close.", "pause_after": 8},
    {"text": "Your thighs now. Heavy with relaxation. Gather every sensation, every nerve signal, and place it gently in the box. Close the lid.", "pause_after": 8},
    {"text": "Your hips, your abdomen, your lower back. All sensation lifted out and placed away. Your lower body no longer sends signals to your brain. It has gone to sleep.", "pause_after": 10},
    {"text": "Your chest, your upper back, your shoulders. Gather and box. Your breathing continues automatically, but you no longer feel your chest moving.", "pause_after": 10},
    {"text": "Both arms now. From shoulders to fingertips. Every nerve, every sensation, gathered and placed in the box. Close it firmly.", "pause_after": 10},
    {"text": "Finally, your neck and head. The muscles of your face, your jaw, your scalp. All sensation boxed and sealed. You are now a point of pure awareness, floating in silence.", "pause_after": 15},
    {"text": "This is Focus Ten. Mind awake. Body asleep. You may notice how quiet it becomes when the body's constant chatter falls away. Rest here and let this state deepen.", "pause_after": 25},

    # ---- Focus 12: Expanded Awareness (14:00 - 22:00) ----
    {"text": "We now move to Focus Twelve. Focus Twelve is a state of expanded awareness. Your consciousness extends beyond the limits of your physical body. See the number twelve on your mental screen.", "pause_after": 10},
    {"text": "From the stillness of Focus Ten, begin to expand your awareness outward. Imagine your perception stretching in all directions, like a sphere of consciousness growing beyond the boundaries of your physical form.", "pause_after": 15},
    {"text": "You can sense the room around you without using your eyes. You can perceive beyond the walls. Your awareness is no longer confined to the space inside your skull. It extends outward, freely, in every direction.", "pause_after": 15},
    {"text": "In Focus Twelve, your perception becomes multi-dimensional. You may begin to perceive colors, patterns, or shapes that have no physical source. These are signals from beyond ordinary perception. Observe them without attachment.", "pause_after": 15},
    {"text": "You may also begin to feel a vibrational surge. A powerful buzzing or humming that seems to come from everywhere at once. This is the vibrational state. It is the bridge between Focus Twelve and Focus Fifteen. Welcome it. Amplify it with your intention.", "pause_after": 20},
    {"text": "Remain in Focus Twelve. Your awareness is vast, unbound, and luminous. You are perceiving from a vantage point far larger than your physical senses normally allow.", "pause_after": 25},
    {"text": "If the vibrations intensify, ride them like a wave. Do not resist. Do not analyze. Simply experience. Your body is safely asleep. Your mind is brilliantly, expansively awake.", "pause_after": 20},

    # ---- Focus 15: No-Time (22:00 - 30:00) ----
    {"text": "We now approach Focus Fifteen. Focus Fifteen is the state of no time. In this state, past, present, and future exist simultaneously. Linear time dissolves. See the number fifteen on your mental screen.", "pause_after": 12},
    {"text": "From the expanded awareness of Focus Twelve, release your connection to the present moment. Let go of the sense that time is flowing from past to future. Allow yourself to enter a state where time simply does not exist.", "pause_after": 15},
    {"text": "In this state, you may feel a profound stillness unlike anything in ordinary experience. There is no hurry. No sequence. No before or after. There is only the eternal now, vast and borderless.", "pause_after": 20},
    {"text": "From Focus Fifteen, separation occurs naturally. You do not need to force it. Simply intend to perceive from a point outside your physical body. Imagine floating upward, gently, like a helium balloon released from a child's hand.", "pause_after": 20},
    {"text": "If you achieve separation, look at your hands. They will appear luminous, translucent. Look around you. The room may appear slightly different, more vivid, bathed in a subtle light.", "pause_after": 15},
    {"text": "If you remain in body, that is perfectly fine. Focus Fifteen itself is a state of extraordinary consciousness. Simply being here is a profound achievement.", "pause_after": 20},
    {"text": "Spend a few moments in this timeless space. Explore with curiosity and wonder. You are safe. You are always connected to your physical body. You can return at any moment simply by intending to.", "pause_after": 30},

    # ---- Return Sequence (30:00 - 35:00) ----
    {"text": "We now begin the return. From Focus Fifteen, gently re-engage your sense of time. Feel the flow of moments returning. See the number twelve on your mental screen as you pass back through Focus Twelve.", "pause_after": 12},
    {"text": "Your expanded awareness gently contracts, like a lens refocusing. You become aware of the room around you again, through normal perception.", "pause_after": 10},
    {"text": "See the number ten. You are back in Focus Ten. Now, one by one, open the energy boxes. Feel sensation returning to your head, your neck, your arms, your chest.", "pause_after": 10},
    {"text": "Sensation flows back into your abdomen, your hips, your legs, your feet. Your body reawakens, refreshed and energized.", "pause_after": 10},
    {"text": "Take a deep, cleansing breath. Feel the air fill your lungs. Feel your body pressing against the surface beneath you. Solid. Real. Present.", "pause_after": 8},
    {"text": "Wiggle your fingers and toes. Roll your head gently from side to side. When you open your eyes, you will feel alert, refreshed, and deeply centered.", "pause_after": 6},
    {"text": "Remember everything you experienced. The states of Focus Ten, Twelve, and Fifteen are available to you whenever you choose to access them. Each journey deepens your skill and expands your capacity.", "pause_after": 6},
    {"text": "Open your eyes now. Welcome back. Take a moment to journal your experience before it fades.", "pause_after": 10},
]

# ---------------------------------------------------------------------------
# Track Definitions
# ---------------------------------------------------------------------------

TRACKS = {
    "ap01-first-gateway": {
        "title": "AP01 - First Gateway: Beginner Astral Projection",
        "script": AP01_SCRIPT,
        "duration_min": 15,
        "targetState": "Astral Projection",
        "description": "Beginner guided meditation for astral projection featuring progressive relaxation, theta brainwave descent, and body awareness dissolution. Uses 4.5 Hz theta binaural beats with Schumann resonance anchoring.",
        "tags": ["guided", "astral projection", "beginner", "theta", "binaural beats", "relaxation"],
        "binaural": {
            "type": "ramp",
            "start_hz": 10.0,    # alpha start
            "end_hz": 4.5,       # deep theta landing
            "base_freq": 120.0,
            "pink_noise": 0.06,
            "hrv_enabled": True,
        },
    },
    "ap02-vibration-state": {
        "title": "AP02 - Vibration State: Intermediate Astral Projection",
        "script": AP02_SCRIPT,
        "duration_min": 25,
        "targetState": "Astral Projection",
        "description": "Intermediate guided meditation inducing the vibrational state prerequisite for astral projection. Features energy body activation, progressive vibration intensification, and the rope technique for separation.",
        "tags": ["guided", "astral projection", "intermediate", "theta", "vibration state", "rope technique", "binaural beats"],
        "binaural": {
            "type": "staged",
            "stages": [
                {"from_hz": 10.0, "to_hz": 7.0, "pct": 0.20},    # alpha -> low alpha
                {"from_hz": 7.0, "to_hz": 4.5, "pct": 0.30},     # theta descent
                {"from_hz": 4.5, "to_hz": 4.0, "pct": 0.30},     # deep theta hold
                {"from_hz": 4.0, "to_hz": 8.0, "pct": 0.20},     # return ramp
            ],
            "base_freq": 120.0,
            "pink_noise": 0.06,
            "hrv_enabled": True,
            "gamma_coupling": True,
        },
    },
    "ap03-full-exit-protocol": {
        "title": "AP03 - Full Exit Protocol: Advanced Astral Projection",
        "script": AP03_SCRIPT,
        "duration_min": 35,
        "targetState": "Astral Projection",
        "description": "Advanced Monroe-style guided meditation progressing through Focus 10 (Mind Awake/Body Asleep), Focus 12 (Expanded Awareness), and Focus 15 (No-Time). Complete exit protocol with resonant tuning, energy boxing, and separation techniques.",
        "tags": ["guided", "astral projection", "advanced", "Monroe", "Focus 10", "Focus 12", "Focus 15", "theta", "binaural beats"],
        "binaural": {
            "type": "staged",
            "stages": [
                {"from_hz": 12.0, "to_hz": 10.0, "pct": 0.08},   # settling (alpha)
                {"from_hz": 10.0, "to_hz": 7.0, "pct": 0.10},    # resonant tuning -> theta
                {"from_hz": 7.0, "to_hz": 4.5, "pct": 0.15},     # Focus 10 descent
                {"from_hz": 4.5, "to_hz": 4.5, "pct": 0.10},     # Focus 10 hold
                {"from_hz": 4.5, "to_hz": 3.5, "pct": 0.15},     # Focus 12 deepening
                {"from_hz": 3.5, "to_hz": 3.5, "pct": 0.10},     # Focus 12 hold
                {"from_hz": 3.5, "to_hz": 2.5, "pct": 0.10},     # Focus 15 deepening
                {"from_hz": 2.5, "to_hz": 2.5, "pct": 0.08},     # Focus 15 hold
                {"from_hz": 2.5, "to_hz": 10.0, "pct": 0.14},    # Return ramp
            ],
            "base_freq": 110.0,
            "pink_noise": 0.05,
            "hrv_enabled": True,
            "gamma_coupling": True,
            "schumann_anchor": True,
        },
    },
}

# ---------------------------------------------------------------------------
# Binaural Beat Generator (numpy, in-memory)
# ---------------------------------------------------------------------------

def generate_binaural_bed(cfg, duration_min, out_wav):
    """Generate a binaural beat background WAV based on track config."""
    samples = int(duration_min * 60 * SR)
    t = np.linspace(0, duration_min * 60, samples, dtype=np.float64)

    base = cfg["base_freq"]

    # Build beat frequency trajectory
    beat_freq = np.zeros(samples, dtype=np.float64)

    if cfg["type"] == "ramp":
        # Simple linear ramp from start_hz to end_hz
        beat_freq = np.linspace(cfg["start_hz"], cfg["end_hz"], samples)

    elif cfg["type"] == "staged":
        # Multi-stage ramp with percentage-based durations
        idx = 0
        for stage in cfg["stages"]:
            n = int(stage["pct"] * samples)
            end_idx = min(idx + n, samples)
            beat_freq[idx:end_idx] = np.linspace(stage["from_hz"], stage["to_hz"], end_idx - idx)
            idx = end_idx
        # Fill any remaining with last value
        if idx < samples:
            beat_freq[idx:] = beat_freq[idx - 1]

    # Generate carriers
    # Left channel: base frequency
    # Right channel: base + beat_freq(t) -- instantaneous frequency integration
    phase_left = PI2 * base * t
    # For time-varying beat: integrate instantaneous frequency
    dt = duration_min * 60 / samples
    phase_offset = np.cumsum(beat_freq) * dt * PI2
    phase_right = PI2 * base * t + phase_offset

    left = np.sin(phase_left)
    right = np.sin(phase_right)

    # Optional Schumann resonance anchoring (7.83 Hz component)
    if cfg.get("schumann_anchor", False):
        sw = 0.12
        left += sw * np.sin(PI2 * (base - 7.83 / 2) * t)
        right += sw * np.sin(PI2 * (base + 7.83 / 2) * t)

    # Optional theta-gamma coupling (40 Hz AM)
    if cfg.get("gamma_coupling", False):
        gamma_mod = 0.06 * np.sin(PI2 * 40.0 * t)
        left *= (1.0 + gamma_mod)
        right *= (1.0 + gamma_mod)

    # HRV 0.1 Hz breath envelope
    if cfg.get("hrv_enabled", False):
        breath = 0.88 + 0.12 * np.sin(PI2 * 0.1 * t)
        left *= breath
        right *= breath

    # Pink noise bed
    noise_level = cfg.get("pink_noise", 0.06)
    if noise_level > 0:
        left += _pink_noise(samples) * noise_level
        right += _pink_noise(samples) * noise_level

    # Phase-coherent fade in/out (50ms)
    fade = int(0.05 * SR)
    left[:fade] *= np.linspace(0, 1, fade)
    right[:fade] *= np.linspace(0, 1, fade)
    left[-fade:] *= np.linspace(1, 0, fade)
    right[-fade:] *= np.linspace(1, 0, fade)

    # Normalize to -3 dBFS
    peak = max(np.max(np.abs(left)), np.max(np.abs(right)))
    target_amp = 10 ** (-3.0 / 20.0)
    if peak > 0:
        scale = target_amp / peak
        left *= scale
        right *= scale

    # Write WAV
    _write_stereo_wav(out_wav, left, right)
    print(f"  [bb] Generated binaural bed: {out_wav} ({duration_min} min)")


def _pink_noise(n):
    """Generate pink noise via Paul Kellet's algorithm."""
    white = np.random.normal(0, 1, n)
    pink = np.zeros(n)
    b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0
    for i in range(n):
        w = white[i]
        b0 = 0.99886 * b0 + w * 0.0555179
        b1 = 0.99332 * b1 + w * 0.0750759
        b2 = 0.96900 * b2 + w * 0.1538520
        b3 = 0.86650 * b3 + w * 0.3104856
        b4 = 0.55000 * b4 + w * 0.5329522
        b5 = -0.7616 * b5 - w * 0.0168980
        pink[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362
        b6 = w * 0.115926
    return pink * 0.7


def _write_stereo_wav(path, left, right):
    """Write 16-bit stereo WAV."""
    left = np.clip(left, -1.0, 1.0)
    right = np.clip(right, -1.0, 1.0)
    li = (left * 32767).astype(np.int16)
    ri = (right * 32767).astype(np.int16)
    stereo = np.empty(li.size + ri.size, dtype=np.int16)
    stereo[0::2] = li
    stereo[1::2] = ri
    with wave.open(path, 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(stereo.tobytes())


# ---------------------------------------------------------------------------
# ElevenLabs TTS
# ---------------------------------------------------------------------------

def tts_segment(voice_id, text, out_wav, model=TTS_MODEL):
    """Call ElevenLabs streaming TTS and save as 44.1k stereo WAV."""
    import requests
    if not API_KEY:
        sys.exit("ELEVEN_API_KEY not set. Set it via: set ELEVEN_API_KEY=<key>")

    headers = {
        "xi-api-key": API_KEY,
        "Accept": "audio/wav",
        "Content-Type": "application/json",
    }
    body = {
        "text": text,
        "model_id": model,
        "voice_settings": TTS_SETTINGS,
    }

    tmp_dl = out_wav + ".dl.wav"
    tmp_conv = out_wav + ".conv.wav"

    with requests.post(
        API_STREAM.format(voice_id=voice_id),
        headers=headers, json=body, stream=True, timeout=180,
    ) as r:
        r.raise_for_status()
        with open(tmp_dl, "wb") as f:
            for chunk in r.iter_content(65536):
                if chunk:
                    f.write(chunk)

    # Force 44.1k stereo s16 PCM
    _run([FFMPEG, "-y", *FFERR, "-i", tmp_dl,
          "-ar", str(SR), "-ac", "2", "-sample_fmt", "s16", tmp_conv])

    if os.path.exists(out_wav):
        os.remove(out_wav)
    os.replace(tmp_conv, out_wav)
    os.remove(tmp_dl)


# ---------------------------------------------------------------------------
# Audio Utilities
# ---------------------------------------------------------------------------

def _run(cmd):
    subprocess.run(cmd, check=True)


def probe_duration(path):
    p = subprocess.run(
        [FFPROBE, "-v", "error", "-show_entries", "format=duration",
         "-of", "default=nw=1:nk=1", path],
        capture_output=True, text=True, check=True,
    )
    return float(p.stdout.strip())


def make_silence(seconds, out_wav):
    secs = max(0.05, float(seconds))
    _run([FFMPEG, "-y", *FFERR, "-f", "lavfi", "-i",
          f"anullsrc=r={SR}:cl=stereo",
          "-t", f"{secs:.3f}", "-c:a", "pcm_s16le", out_wav])


def concat_wavs(wavs, out_wav):
    with tempfile.NamedTemporaryFile("w", delete=False, encoding="utf-8", suffix=".txt") as lst:
        for w in wavs:
            p = pathlib.Path(w).resolve().as_posix()
            lst.write(f"file '{p}'\n")
        listpath = lst.name
    _run([FFMPEG, "-y", *FFERR, "-f", "concat", "-safe", "0",
          "-i", listpath, "-c", "copy", out_wav])
    os.remove(listpath)


def sidechain_mix(bg_path, vo_path, out_stem):
    """Mix voice over binaural bed with sidechain ducking."""
    out_webm = f"{out_stem}.webm"
    out_m4a = f"{out_stem}.m4a"

    _run([
        FFMPEG, "-y", *FFERR,
        "-i", bg_path, "-i", vo_path,
        "-filter_complex",
        # BG attenuated -12dB from voice; sidechain duck when voice speaks
        "[0:a]volume=-12dB[bg];"
        "[1:a]highpass=f=80,deesser=i=0.3,dynaudnorm=f=200:g=5[vo];"
        "[bg][vo]sidechaincompress=threshold=-28dB:ratio=6:attack=25:release=400:makeup=2[duck];"
        "[duck][vo]amix=inputs=2:normalize=0[mix];"
        "[mix]alimiter=limit=0.891[a]",
        "-map", "[a]", "-c:a", "libopus", "-b:a", "160k", out_webm,
    ])

    _run([
        FFMPEG, "-y", *FFERR,
        "-i", out_webm,
        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
        out_m4a,
    ])

    return out_webm, out_m4a


# ---------------------------------------------------------------------------
# Build Pipeline
# ---------------------------------------------------------------------------

def build_track(track_id, spec):
    """Build a single guided meditation track end-to-end."""
    print(f"\n{'='*60}")
    print(f"Building: {spec['title']}")
    print(f"{'='*60}")

    duration_min = spec["duration_min"]
    script = spec["script"]

    # 1. Generate binaural beat background
    bed_wav = os.path.join(OUT_DIR, f"__{track_id}_bed.wav")
    generate_binaural_bed(spec["binaural"], duration_min, bed_wav)

    # 2. Generate TTS segments + silence gaps
    seg_files = []
    for i, entry in enumerate(script, start=1):
        seg_wav = os.path.join(OUT_DIR, f"__{track_id}_seg{i:03d}.wav")
        print(f"  [tts] Segment {i}/{len(script)}: {entry['text'][:60]}...")
        tts_segment(VOICE_ID, entry["text"], seg_wav)
        seg_files.append(seg_wav)

    # 3. Assemble voice track with silence gaps
    # Measure segment durations
    seg_durs = [probe_duration(f) for f in seg_files]
    total_speech = sum(seg_durs)
    total_pauses = sum(e["pause_after"] for e in script)
    total_target = duration_min * 60

    # Calculate margins
    margin_start = max(10.0, total_target * 0.03)   # 3% or 10s lead-in
    margin_end = max(15.0, total_target * 0.04)      # 4% or 15s tail

    # If total speech + pauses > target, scale pauses down
    available = total_target - margin_start - margin_end - total_speech
    if total_pauses > available:
        scale = max(0.3, available / total_pauses)
        print(f"  [gap] Scaling pauses by {scale:.2f}x to fit duration")
    else:
        scale = 1.0

    glue = []
    # Leading silence
    lead = os.path.join(OUT_DIR, f"__{track_id}_sil_lead.wav")
    make_silence(margin_start, lead)
    glue.append(lead)

    for idx, seg_path in enumerate(seg_files):
        glue.append(seg_path)
        pause_s = script[idx]["pause_after"] * scale
        if pause_s > 0.1:
            sil = os.path.join(OUT_DIR, f"__{track_id}_sil_{idx:03d}.wav")
            make_silence(pause_s, sil)
            glue.append(sil)

    # Trailing silence
    trail = os.path.join(OUT_DIR, f"__{track_id}_sil_trail.wav")
    make_silence(margin_end, trail)
    glue.append(trail)

    vo_full = os.path.join(OUT_DIR, f"__{track_id}_voice.wav")
    concat_wavs(glue, vo_full)
    print(f"  [vo] Voice track assembled: {probe_duration(vo_full):.1f}s")

    # 4. Mix voice over binaural bed
    stem = os.path.join(OUT_DIR, track_id)
    webm, m4a = sidechain_mix(bed_wav, vo_full, stem)
    print(f"  [mix] Output: {webm}, {m4a}")

    # 5. Cleanup temp files
    cleanup = [bed_wav, vo_full] + seg_files + [f for f in glue if f not in seg_files]
    for f in cleanup:
        try:
            os.remove(f)
        except OSError:
            pass

    # 6. Compute actual duration
    actual_dur = int(probe_duration(webm))

    # 7. Return manifest entry
    return {
        "id": track_id,
        "title": spec["title"],
        "filenameWebm": pathlib.Path(webm).name,
        "filenameAac": pathlib.Path(m4a).name,
        "durationSec": actual_dur,
        "targetState": spec["targetState"],
        "beatHz": spec["binaural"].get("end_hz",
                    spec["binaural"].get("stages", [{}])[-1].get("to_hz", 4.5)),
        "tags": spec["tags"],
        "gainDb": 0,
        "description": spec["description"],
    }


def main():
    print("Astral Projection Guided Meditation Builder")
    print("=" * 60)

    if not API_KEY:
        print("\nWARNING: ELEVEN_API_KEY not set.")
        print("Set it via:  set ELEVEN_API_KEY=<your key>")
        print("Running in bed-only mode (no TTS)...\n")

    manifest_entries = []

    for track_id, spec in TRACKS.items():
        if not API_KEY:
            # Generate bed only (for testing)
            bed_wav = os.path.join(OUT_DIR, f"{track_id}_bed_preview.wav")
            generate_binaural_bed(spec["binaural"], spec["duration_min"], bed_wav)
            print(f"  [preview] Bed-only WAV: {bed_wav}")
            continue

        entry = build_track(track_id, spec)
        manifest_entries.append(entry)

    if manifest_entries:
        # Write manifest patch
        patch_path = os.path.join(OUT_DIR, "manifest_ap_patch.json")
        with open(patch_path, "w", encoding="utf-8") as f:
            json.dump({"tracks": manifest_entries}, f, indent=2)
        print(f"\nManifest patch: {patch_path}")

        # Also update tracks.json if present
        tracks_json = os.path.join(OUT_DIR, "tracks.json")
        if os.path.exists(tracks_json):
            with open(tracks_json, "r", encoding="utf-8") as f:
                data = json.load(f)
            existing_ids = {t["id"] for t in data["tracks"]}
            added = 0
            for entry in manifest_entries:
                if entry["id"] not in existing_ids:
                    data["tracks"].append(entry)
                    added += 1
            if added:
                data["totalTracks"] = len(data["tracks"])
                data["lastUpdated"] = "2026-03-31T00:00:00.000Z"
                with open(tracks_json, "w", encoding="utf-8") as f:
                    json.dump(data, f, indent=2)
                print(f"Updated tracks.json: added {added} tracks (total: {data['totalTracks']})")

    print("\nDone!")


if __name__ == "__main__":
    main()
