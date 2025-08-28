#!/usr/bin/env python3
# build_guided_same_dir.py
# Creates guided NV tracks IN-PLACE directory (no subfolders).
# Requires: Python, ffmpeg, requests. Reads ELEVEN_API_KEY from env.
import os, json, subprocess, pathlib, tempfile, requests, sys, math

FFERR = ["-hide_banner","-loglevel","error"]
API_STREAM = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream"

API_KEY = os.getenv("ELEVEN_API_KEY")
if not API_KEY:
    sys.exit("ELEVEN_API_KEY not set. In PowerShell:  setx ELEVEN_API_KEY \"<new key>\"")

def run(cmd):
    subprocess.run(cmd, check=True)

def probe_duration(path):
    p = subprocess.run(["ffprobe","-v","error","-show_entries","format=duration",
                        "-of","default=nw=1:nk=1", path],
                       capture_output=True, text=True, check=True)
    return float(p.stdout.strip())

def tts_segment(voice_id:str, text:str, out_wav:str, model="eleven_turbo_v2"):
    headers = {"xi-api-key": API_KEY, "Accept":"audio/wav", "Content-Type":"application/json"}
    body = {
        "text": text,
        "model_id": model,
        "voice_settings": {"stability":0.4,"similarity_boost":0.8,"style":0.2,"use_speaker_boost":True}
    }
    tmp_dl  = out_wav + ".dl.wav"   # download here
    tmp_conv= out_wav + ".conv.wav" # convert here

    # 1) download ElevenLabs stream to tmp
    with requests.post(API_STREAM.format(voice_id=voice_id), headers=headers, json=body, stream=True, timeout=120) as r:
        r.raise_for_status()
        with open(tmp_dl,"wb") as f:
            for chunk in r.iter_content(65536):
                if chunk: f.write(chunk)

    # 2) force 44.1k stereo s16 to a second tmp
    run(["ffmpeg","-y",*FFERR,"-i",tmp_dl,"-ar","44100","-ac","2","-sample_fmt","s16", tmp_conv])

    # 3) move into the requested path (atomic replace)
    if os.path.exists(out_wav):
        os.remove(out_wav)
    os.replace(tmp_conv, out_wav)
    os.remove(tmp_dl)


def make_silence(seconds:float, out_wav:str):
    secs = max(0.05, float(seconds))
    run(["ffmpeg","-y",*FFERR,"-f","lavfi","-i",f"anullsrc=r=44100:cl=stereo","-t",f"{secs:.3f}",
         "-c:a","pcm_s16le", out_wav])

def concat_wavs(wavs, out_wav):
    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".txt") as lst:
        for w in wavs: lst.write(f"file '{pathlib.Path(w).as_posix()}'\n")
        listpath = lst.name
    run(["ffmpeg","-y",*FFERR,"-f","concat","-safe","0","-i",listpath,"-c","copy",out_wav])
    os.remove(listpath)

def sidechain_mix(bg_path, vo_path, out_stem):
    out_webm = f"{out_stem}.webm"
    out_m4a  = f"{out_stem}.m4a"
    run([
        "ffmpeg","-y",*FFERR,"-i",bg_path,"-i",vo_path,
        "-filter_complex",
        "[0:a]volume=1.0[bg];"
        "[1:a]highpass=f=80,deesser=i=12:s=0.5,dynaudnorm=f=200:g=5,alimiter=limit=-1.0[vo];"
        "[bg][vo]sidechaincompress=threshold=-28dB:ratio=6:attack=25:release=300:makeup=3[duck];"
        "[duck][vo]amix=inputs=2:normalize=0[a]",
        "-map","[a]","-c:a","libopus","-b:a","160k", out_webm
    ])
    run(["ffmpeg","-y",*FFERR,"-i",out_webm,"-c:a","aac","-b:a","192k","-movflags","+faststart",out_m4a])
    return out_webm, out_m4a

def ensure_bed_length(bed_path, minutes:int):
    """If bed duration already matches minutes, return as-is.
       If short, call extend_bb.py (present in same folder). Prefers .m4a to avoid Opus header errors."""
    target = minutes*60.0
    try:
        dur = probe_duration(bed_path)
    except subprocess.CalledProcessError:
        # try alternate container (switch webm<->m4a)
        alt = bed_path.replace(".webm",".m4a") if bed_path.endswith(".webm") else bed_path.replace(".m4a",".webm")
        if os.path.exists(alt):
            bed_path = alt
            dur = probe_duration(bed_path)
        else:
            raise
    if abs(dur - target) < 2.0:
        return bed_path  # already correct length

    # extend using helper
    helper = "extend_bb.py"
    if not os.path.exists(helper):
        raise SystemExit("extend_bb.py not found in this folder; copy it here first.")
    # choose loop window for ramps
    args = ["python", helper, "--in", bed_path, "--minutes", str(minutes), "--outdir", "."]
    if any(k in pathlib.Path(bed_path).name for k in ["NV01","NV03","NV12","NV13"]):
        args += ["--loop-start","00:00:10","--loop-end","00:00:35","--xfade","6"]
    run(args)
    stem = pathlib.Path(bed_path).with_suffix("").name
    # extend_bb emits <stem>_<minutes>min.webm; prefer that
    candidate = f"{stem}_{minutes}min.webm"
    if not os.path.exists(candidate):
        # try m4a
        candidate = f"{stem}_{minutes}min.m4a"
    return candidate

def build_one(title, bed, minutes, voice_id, suffix):
    # pick bed file (prefer m4a to dodge bad webm headers)
    bed_src = bed if os.path.exists(bed) else bed.replace(".webm",".m4a")
    if not os.path.exists(bed_src):
        raise FileNotFoundError(f"Missing bed: {bed}")
    bed_long = ensure_bed_length(bed_src, minutes)

    # TTS: make segments, then auto-space them across the duration
    # You can customize the script lines per title below in PLAN
    lines = PLAN_TEXT[title]
    seg_paths = []
    for i, line in enumerate(lines, start=1):
        seg = f"__{suffix}_{i:02d}.wav"
        tts_segment(voice_id, line, seg)
        seg_paths.append(seg)

    # measure segment durations and compute uniform gaps with margins
    seg_durs = [probe_duration(p) for p in seg_paths]
    total = minutes*60.0
    margin_start = max(15.0, total*0.02)   # ~2% or 15s
    margin_end   = max(20.0, total*0.03)   # ~3% or 20s
    budget = total - (margin_start + margin_end) - sum(seg_durs)
    gap = max(5.0, budget / (len(seg_paths)+1))

    glue = []
    # leading silence
    lead = f"__sil_lead_{suffix}.wav"; make_silence(margin_start + gap, lead); glue.append(lead)
    # interleave seg + gap
    for idx, seg in enumerate(seg_paths):
        glue.append(seg)
        tail = f"__sil_{suffix}_{idx:02d}.wav"
        # last gap handled by end margin below, so only add if not last
        if idx != len(seg_paths)-1:
            make_silence(gap, tail); glue.append(tail)
    # end margin
    end = f"__sil_end_{suffix}.wav"; make_silence(margin_end, end); glue.append(end)

    vo_full = f"__VO_{suffix}.wav"
    concat_wavs(glue, vo_full)

    # mix with sidechain ducking, output to same dir
    bed_stem = pathlib.Path(bed).with_suffix("").name
    stem_out = f"{bed_stem}_GUIDED_{suffix}_{minutes}min"
    webm, m4a = sidechain_mix(bed_long, vo_full, stem_out)

    # cleanup temps
    for p in seg_paths + glue:
        try: os.remove(p)
        except: pass
    try: os.remove(vo_full)
    except: pass

    return webm, m4a

# ===== PLAN =====
# Map titles -> lines; choose which bed + minutes + which voices to render below.
PLAN_TEXT = {
    "GX01 • RV Stride": [
        "Settle. Headphones on. Breathe in for four, out for six. Widen attention.",
        "State the intent: I will perceive, not analyze. Place a blank target tag.",
        "Textures first. One word only. Move on.",
        "Edges and forms. Straight, curved, tall, flat.",
        "Temperature and soundscape. Hover above the most interesting feature.",
        "Sketch three strokes in imagination. Note one color. Release the target.",
        "Return gently. Ground."
    ],
    "GX02 • AP Gate": [
        "Body still. Belly breath. Let the theta hum carry you.",
        "Rope technique. Reach, do not pull. Label sensations as signal.",
        "Expand the space behind the head by one room length.",
        "Float test on the exhale. Awareness rises; body stays.",
        "If pulled back, reset and continue.",
        "Stabilize with imagined palm friction, then release.",
        "Set the re entry plan. Count up slowly and ground."
    ],
    "GX03 • Reintegration": [
        "Awareness returns like dawn. Let the breath lengthen.",
        "Name three things you appreciate in this moment.",
        "Gentle wake up: fingers, toes, jaw, neck.",
        "Choose one image, one texture, one feeling to journal.",
        "Plan the next step: water, note, stretch. Count up and open."
    ]
}

# Which beds and durations to use:
BEDS = {
    "GX01 • RV Stride":   {"bed":"NV01_RV_Primer_12to7p83.webm","minutes":45},
    "GX02 • AP Gate":     {"bed":"NV03_Gate_8to4.webm","minutes":60},
    "GX03 • Reintegration":{"bed":"NV12_AnchorReturn_8to12.webm","minutes":30}
}

# Voices (from user)
VOICE_MALE   = "wgHvco1wiREKN0BdyVx5"
VOICE_FEMALE = "1wGbFxmAM3Fgw63G1zZJ"

def main():
    out_manifest = []
    for title, spec in BEDS.items():
        bed = spec["bed"]; minutes = int(spec["minutes"])

        # Male
        webm, m4a = build_one(title, bed, minutes, VOICE_MALE, "m")
        out_manifest.append({"id": f"{title} m".lower().replace(" ","-"),
                             "title": f"{title} (male)",
                             "filenameWebm": pathlib.Path(webm).name,
                             "filenameAac": pathlib.Path(m4a).name,
                             "durationSec": minutes*60,
                             "tags":["guided","male","elevenlabs","sidechain"],
                             "gainDb":0})

        # Female
        webm, m4a = build_one(title, bed, minutes, VOICE_FEMALE, "f")
        out_manifest.append({"id": f"{title} f".lower().replace(" ","-"),
                             "title": f"{title} (female)",
                             "filenameWebm": pathlib.Path(webm).name,
                             "filenameAac": pathlib.Path(m4a).name,
                             "durationSec": minutes*60,
                             "tags":["guided","female","elevenlabs","sidechain"],
                             "gainDb":0})
        print(f"✔ {title} — male & female built")

    json.dump({"tracks": out_manifest}, open("manifest_guided_patch.json","w",encoding="utf-8"), indent=2)
    print("\nPatch written: manifest_guided_patch.json (same directory).")

if __name__ == "__main__":
    main()
