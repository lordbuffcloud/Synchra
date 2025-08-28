# extend_inplace.ps1 — extend NV01..NV15 IN-PLACE (30–90 min)
Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Resolve Python
$PY = if (Get-Command py -ErrorAction SilentlyContinue) { "py" }
      elseif (Get-Command python -ErrorAction SilentlyContinue) { "python" }
      else { throw "Python not found on PATH." }

# Require ffmpeg + helper
if (-not (Get-Command ffmpeg -ErrorAction SilentlyContinue)) { throw "ffmpeg not found on PATH." }
if (-not (Test-Path ".\extend_bb.py")) { throw "extend_bb.py not in this folder." }

# Duration + loop plan
$plan = @(
  @{Base="NV01_RV_Primer_12to7p83";      Min=45; LoopStart="00:00:10"; LoopEnd="00:00:35"; X=6}
  @{Base="NV02_Schumann_Hold_7p83";      Min=45}
  @{Base="NV03_Gate_8to4";               Min=60; LoopStart="00:00:10"; LoopEnd="00:00:35"; X=6}
  @{Base="NV04_Theta_Stabilizer_6Hz";    Min=75}
  @{Base="NV05_CFC_Theta6_Gamma40";      Min=30}
  @{Base="NV06_BreathSync_10to6_0p1Hz";  Min=45}
  @{Base="NV07_DualBeat_6_and_12";       Min=45}
  @{Base="NV08_MicroITD_Drift_6Hz";      Min=45}
  @{Base="NV09_SpindleBridge_13Hz_onBed";Min=45}
  @{Base="NV10_GammaASSR_8HzBeat_40AM";  Min=30}
  @{Base="NV11_DeltaGate_4to3";          Min=90}
  @{Base="NV12_AnchorReturn_8to12";      Min=30; LoopStart="00:00:10"; LoopEnd="00:00:35"; X=6}
  @{Base="NV13_Schumann_Steps_7p83";     Min=45; LoopStart="00:00:10"; LoopEnd="00:00:35"; X=6}
  @{Base="NV14_Stochastic_Dither_6Hz";   Min=45}
  @{Base="NV15_HemiAlternator_6Hz_swap10s"; Min=45}
)

# Temp work dir
$tmp = ".\_ext_tmp"
New-Item -ItemType Directory -Force -Path $tmp | Out-Null

$patch = @()

function Extend-InPlace {
  param([hashtable]$p)

  $base = $p.Base
  $inWebm = Join-Path $PWD "$base.webm"
  $inM4a  = Join-Path $PWD "$base.m4a"
  $inFile = if (Test-Path $inWebm) { $inWebm }
            elseif (Test-Path $inM4a) { $inM4a }
            else {
              Write-Warning ("{0}: no input found (.webm/.m4a) - skipped" -f $base)
              return
            }

  $args = @("--in",$inFile,"--minutes",$p.Min,"--outdir",$tmp)
  if ($p.ContainsKey("LoopStart")) { $args += @("--loop-start",$p.LoopStart) }
  if ($p.ContainsKey("LoopEnd"))   { $args += @("--loop-end",$p.LoopEnd) }
  $xf = if ($p.ContainsKey("X")) { [int]$p.X } else { 5 }
  $args += @("--xfade",$xf)

  $json = & $PY "extend_bb.py" @args
  $obj = $json | ConvertFrom-Json

  $newWebm = $obj.webm
  $newM4a  = $obj.m4a

  $dstWebm = Join-Path $PWD "$base.webm"
  $dstM4a  = Join-Path $PWD "$base.m4a"

  if (Test-Path $newWebm) { Move-Item -Force $newWebm $dstWebm }
  if (Test-Path $newM4a)  { Move-Item -Force $newM4a  $dstM4a  }

  $id = switch -Wildcard ($base) {
    "NV01_RV_Primer_12to7p83"        { "nv01-rv-primer-12to7p83" }
    "NV02_Schumann_Hold_7p83"        { "nv02-schumann-hold-7p83" }
    "NV03_Gate_8to4"                 { "nv03-gate-8to4" }
    "NV04_Theta_Stabilizer_6Hz"      { "nv04-theta-stabilizer-6" }
    "NV05_CFC_Theta6_Gamma40"        { "nv05-cfc-theta6-gamma40" }
    "NV06_BreathSync_10to6_0p1Hz"    { "nv06-breathsync-10to6" }
    "NV07_DualBeat_6_and_12"         { "nv07-dualbeat-6-12" }
    "NV08_MicroITD_Drift_6Hz"        { "nv08-microitd-drift-6" }
    "NV09_SpindleBridge_13Hz_onBed"  { "nv09-spindlebridge-13-on-bed" }
    "NV10_GammaASSR_8HzBeat_40AM"    { "nv10-gamma-assr-8-40am" }
    "NV11_DeltaGate_4to3"            { "nv11-delta-gate-4to3" }
    "NV12_AnchorReturn_8to12"        { "nv12-anchor-return-8to12" }
    "NV13_Schumann_Steps_7p83"       { "nv13-schumann-steps" }
    "NV14_Stochastic_Dither_6Hz"     { "nv14-stochastic-dither-6" }
    "NV15_HemiAlternator_6Hz_swap10s"{ "nv15-hemi-alternator-6-swap10" }
  }

  $patch += [pscustomobject]@{
    id = $id
    filenameWebm = "$base.webm"
    filenameAac  = "$base.m4a"
    durationSec  = ([int]$p.Min) * 60
  }

  Write-Host ("OK {0} -> {1} min (in-place)" -f $base, $p.Min) -ForegroundColor Green
}

foreach ($p in $plan) { Extend-InPlace $p }

Remove-Item -Recurse -Force $tmp

$patch | ConvertTo-Json -Depth 4 | Set-Content ".\manifest_duration_patch.json" -Encoding UTF8
Write-Host "`nUpdated durations written to manifest_duration_patch.json" -ForegroundColor Cyan
