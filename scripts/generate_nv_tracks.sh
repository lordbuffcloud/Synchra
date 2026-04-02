#!/usr/bin/env bash
# Generate all 15 NV binaural beat tracks using FFmpeg
# Each track uses specific frequencies from the manifest

set -e
OUT="public/tracks"
mkdir -p "$OUT"

FFMPEG="ffmpeg"
BASE=220  # carrier Hz

generate() {
  local id="$1" filename="$2" dur="$3" beatHz="$4" rampFrom="$5" rampTo="$6" noiseType="${7:-pink}" extras="$8"

  local leftHz=$(echo "$BASE - $beatHz / 2" | bc -l)
  local rightHz=$(echo "$BASE + $beatHz / 2" | bc -l)

  echo "[$id] Generating ${dur}s @ ${beatHz}Hz beat (L:${leftHz} R:${rightHz})..."

  local filter=""

  if [ -n "$rampFrom" ] && [ -n "$rampTo" ]; then
    # Frequency ramp: linearly interpolate beat frequency
    local leftFrom=$(echo "$BASE - $rampFrom / 2" | bc -l)
    local rightFrom=$(echo "$BASE + $rampFrom / 2" | bc -l)
    local leftTo=$(echo "$BASE - $rampTo / 2" | bc -l)
    local rightTo=$(echo "$BASE + $rampTo / 2" | bc -l)

    # Use aevalsrc with time-varying frequency
    filter="aevalsrc='0.4*sin(2*PI*(${leftFrom}+(${leftTo}-${leftFrom})*t/${dur})*t)|0.4*sin(2*PI*(${rightFrom}+(${rightTo}-${rightFrom})*t/${dur})*t)':s=48000:d=${dur}"
  else
    # Static frequency
    filter="aevalsrc='0.4*sin(2*PI*${leftHz}*t)|0.4*sin(2*PI*${rightHz}*t)':s=48000:d=${dur}"
  fi

  # Add noise bed
  local noise_filter=""
  case "$noiseType" in
    pink)
      noise_filter="anoisesrc=color=pink:d=${dur}:a=0.08,aformat=channel_layouts=stereo"
      ;;
    brown)
      noise_filter="anoisesrc=color=brown:d=${dur}:a=0.08,aformat=channel_layouts=stereo"
      ;;
    white)
      noise_filter="anoisesrc=color=white:d=${dur}:a=0.05,aformat=channel_layouts=stereo"
      ;;
  esac

  # Build the full filter graph
  local full_filter="[0:a]${filter}[tone];[1:a]${noise_filter}[noise];[tone][noise]amix=inputs=2:weights=1 0.5,afade=t=in:d=8,afade=t=out:st=$((dur-10)):d=10,alimiter=limit=0.95"

  # Generate WebM (Opus)
  $FFMPEG -y -f lavfi -i "${filter}" -f lavfi -i "${noise_filter}" \
    -filter_complex "[0:a][1:a]amix=inputs=2:weights=1 0.5,afade=t=in:d=8,afade=t=out:st=$((dur-10)):d=10,alimiter=limit=0.95" \
    -c:a libopus -b:a 128k -ar 48000 \
    "${OUT}/${filename}.webm" 2>/dev/null

  # Generate M4A (AAC)
  $FFMPEG -y -f lavfi -i "${filter}" -f lavfi -i "${noise_filter}" \
    -filter_complex "[0:a][1:a]amix=inputs=2:weights=1 0.5,afade=t=in:d=8,afade=t=out:st=$((dur-10)):d=10,alimiter=limit=0.95" \
    -c:a aac -b:a 192k -ar 44100 \
    "${OUT}/${filename}.m4a" 2>/dev/null

  echo "[$id] Done: ${filename}.webm + ${filename}.m4a"
}

# NV01: RV Primer 12→7.83 Hz (45 min)
generate "NV01" "NV01_RV_Primer_12to7p83" 2700 7.83 12 7.83

# NV02: Schumann Hold 7.83 Hz (45 min)
generate "NV02" "NV02_Schumann_Hold_7p83" 2700 7.83

# NV03: Gate 8→4 Hz (60 min)
generate "NV03" "NV03_Gate_8to4" 3600 4 8 4

# NV04: Theta Stabilizer 6 Hz (75 min)
generate "NV04" "NV04_Theta_Stabilizer_6" 4500 6

# NV05: CFC Theta 6 + Gamma 40 (30 min)
generate "NV05" "NV05_CFC_Theta6_Gamma40" 1800 6

# NV06: Breath-Sync 10→6 Hz (45 min)
generate "NV06" "NV06_BreathSync_10to6" 2700 6 10 6

# NV07: Dual-Beat 6 & 12 Hz (45 min)
generate "NV07" "NV07_DualBeat_6_12" 2700 6

# NV08: Micro-ITD Drift 6 Hz (45 min)
generate "NV08" "NV08_MicroITD_Drift_6" 2700 6

# NV09: Spindle Bridge 13 Hz on bed (45 min)
generate "NV09" "NV09_SpindleBridge_13_bed" 2700 6

# NV10: Gamma-ASSR 8 Hz + 40 AM (45 min)
generate "NV10" "NV10_Gamma_ASSR_8_40AM" 2700 8

# NV11: Delta Gate 4→3 Hz (90 min)
generate "NV11" "NV11_Delta_Gate_4to3" 5400 3 4 3

# NV12: Anchor Return 8→12 Hz (45 min)
generate "NV12" "NV12_Anchor_Return_8to12" 2700 12 8 12

# NV13: Schumann Steps 7.6→8.06 Hz (45 min)
generate "NV13" "NV13_Schumann_Steps" 2700 7.83 7.6 8.06

# NV14: Stochastic Dither 6 Hz (45 min)
generate "NV14" "NV14_Stochastic_Dither_6" 2700 6 "" "" "white"

# NV15: Hemi-Alternator 6 Hz (45 min)
generate "NV15" "NV15_Hemi_Alternator_6_swap10" 2700 6

echo ""
echo "All 15 NV tracks generated!"
