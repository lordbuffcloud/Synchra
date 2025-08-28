#!/usr/bin/env bash
set -euo pipefail

# Resolve Python on Windows Git Bash
PY="$(command -v python || true)"
if [ -z "$PY" ]; then
  PY="$(command -v py || true)"
fi
if [ -z "$PY" ]; then
  # common install locations — add more if needed
  for P in \
    "/c/Windows/py.exe" \
    "/c/Users/$lordb/AppData/Local/Programs/Python/Python312/python.exe" \
    "/c/Program Files/Python312/python.exe" \
    "/c/Program Files/Python311/python.exe"; do
    [ -x "$P" ] && PY="$P" && break
  done
fi
[ -z "$PY" ] && { echo "Python not found; run PowerShell version or add python.exe to PATH."; exit 1; }

[ -f "./extend_bb.py" ] || { echo "extend_bb.py not found in current dir."; exit 1; }
mkdir -p extended

# Ramps: explicit loop window to preserve intro/outro feel
"$PY" extend_bb.py --in "NV01_RV_Primer_12to7p83.webm"         --minutes 45 --outdir extended --loop-start 00:00:10 --loop-end 00:00:35 --xfade 6
"$PY" extend_bb.py --in "NV03_Gate_8to4.webm"                    --minutes 60 --outdir extended --loop-start 00:00:10 --loop-end 00:00:35 --xfade 6
"$PY" extend_bb.py --in "NV12_AnchorReturn_8to12.webm"           --minutes 30 --outdir extended --loop-start 00:00:10 --loop-end 00:00:35 --xfade 6
"$PY" extend_bb.py --in "NV13_Schumann_Steps_7p83.webm"          --minutes 45 --outdir extended --loop-start 00:00:10 --loop-end 00:00:35 --xfade 6

# Steady tracks: default middle-50% loop, 5s xfade
"$PY" extend_bb.py --in "NV02_Schumann_Hold_7p83.webm"           --minutes 45 --outdir extended
"$PY" extend_bb.py --in "NV04_Theta_Stabilizer_6Hz.webm"         --minutes 75 --outdir extended
"$PY" extend_bb.py --in "NV05_CFC_Theta6_Gamma40.webm"           --minutes 30 --outdir extended
"$PY" extend_bb.py --in "NV06_BreathSync_10to6_0p1Hz.webm"       --minutes 45 --outdir extended
"$PY" extend_bb.py --in "NV07_DualBeat_6_and_12.webm"            --minutes 45 --outdir extended
"$PY" extend_bb.py --in "NV08_MicroITD_Drift_6Hz.webm"           --minutes 45 --outdir extended
"$PY" extend_bb.py --in "NV09_SpindleBridge_13Hz_onBed.webm"     --minutes 45 --outdir extended
"$PY" extend_bb.py --in "NV10_GammaASSR_8HzBeat_40AM.webm"       --minutes 30 --outdir extended
"$PY" extend_bb.py --in "NV11_DeltaGate_4to3.webm"               --minutes 90 --outdir extended
"$PY" extend_bb.py --in "NV14_Stochastic_Dither_6Hz.webm"        --minutes 45 --outdir extended
"$PY" extend_bb.py --in "NV15_HemiAlternator_6Hz_swap10s.webm"   --minutes 45 --outdir extended

echo "Done → ./extended"
