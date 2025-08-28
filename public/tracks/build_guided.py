#!/usr/bin/env python3
import os, json, subprocess, pathlib, math, tempfile
from eleven_tts import tts_segment, concat_wavs

FFERR = ["-hide_banner","-loglevel","error"]

def probe_duration(path):
    p = subprocess.run(["ffprobe","-v","error","-show_entries","format=duration","-of","default=nw=1:nk=1",path], capture_output=True, text=True, check=True)
    return float(p.stdout.strip())

def sidechain_mix(bg_path, vo_path, out_stem):
    # duck bg by ~8 dB when voice speaks; export webm + m4a
    out_webm = f"{out_stem}.webm"
    out_m4a  = f"{out_stem}.m4a"
    fc = [
        "ffmpeg","-y",*FFERR,"-i",bg_path,"-i",vo_path,
        "-filter_complex",
        "[0:a]volume=1.0[bg];[1:a]highpass=f=80, deesser=i=12:s=0.5, dynaudnorm=f=200:g=5, alimiter=limit=-1.0[vo];"
        "[bg][vo]sidechaincompress=threshold=-28dB:ratio=6:attack=25:release=300:makeup=3[duck];"
        "[duck][vo]amix=inputs=2:normalize=0[a]",
        "-map","[a]","-c:a","libopus","-b:a","160k", out_webm
    ]
    subprocess.run(fc, check=True)
    subprocess.run(["ffmpeg","-y",*FFERR,"-i",out_webm,"-c:a","aac","-b:a","192k","-movflags","+faststart",out_m4a], check=True)
    return out_webm, out_m4a

def stretch_if_needed(bg_in, minutes):
    # If your NV bed already has the target length, we keep it.
    # If it's short (e.g., 45s prototypes), reuse extend_bb.py loop logic via CLI.
    dur = probe_duration(bg_in)
    target = minutes * 60.0
    if abs(dur - target) < 2.0: return bg_in
    tmp = f"__tmp_{pathlib.Path(bg_in).stem}_{minutes}min.webm"
    # center-window loop (10–35s) is good for NV01/NV03/NV12; others: default middle 50%
    if any(k in bg_in for k in ["NV01","NV03","NV12","NV13"]):
        args = ["python","extend_bb.py","--in",bg_in,"--minutes",str(minutes),"--outdir",".","--loop-start","00:00:10","--loop-end","00:00:35","--xfade","6"]
    else:
        args = ["python","extend_bb.py","--in",bg_in,"--minutes",str(minutes),"--outdir","."]
    subprocess.run(args, check=True)
    # extend_bb emits both webm+m4a; prefer the webm here
    return tmp if os.path.exists(tmp) else bg_in.replace(".webm", f"_{minutes}min.webm")

def main():
    cfg = json.load(open("guides/nv_guides.json","r",encoding="utf-8"))
    pathlib.Path("guided_out").mkdir(exist_ok=True)
    manifest = []
    for gid, spec in cfg.items():
        title = spec["title"]; bed = spec["bed"]; minutes = int(spec["durationMin"])
        voice = spec["voiceId"]; texts = spec["text"]
        # Stretch bed if needed
        bed_src = bed if os.path.exists(bed) else bed.replace(".webm",".m4a")
        assert os.path.exists(bed_src), f"Missing bed: {bed}"
        bed_long = stretch_if_needed(bed_src, minutes)
        # TTS per segment
        segs = []
        for i, line in enumerate(texts, start=1):
            seg = f"__{gid}_seg{i:02d}.wav"
            tts_segment(voice, line, seg)
            segs.append(seg)
        vo_path = f"__{gid}_voice_full.wav"
        concat_wavs(segs, vo_path)
        # Mix with sidechain duck
        stem = f"guided_out/{pathlib.Path(bed).stem}_GUIDED_{minutes}min"
        webm, m4a = sidechain_mix(bed_long, vo_path, stem)
        # Clean temp segments
        for s in segs: os.remove(s)
        if vo_path and os.path.exists(vo_path): os.remove(vo_path)
        # Manifest item
        manifest.append({
          "id": gid,
          "title": title,
          "filenameWebm": os.path.basename(webm),
          "filenameAac": os.path.basename(m4a),
          "durationSec": minutes*60,
          "tags": ["guided","binaural beats","sidechain","elevenlabs"],
          "gainDb": 0,
          "description": f"{title} over {pathlib.Path(bed).stem} with sidechained voice guidance."
        })
        print(f"✔ {title} → {minutes} min")
    json.dump({"tracks":manifest}, open("guided_out/manifest.json","w",encoding="utf-8"), indent=2)
    print("\nManifest: guided_out/manifest.json")

if __name__ == "__main__":
    main()
