#!/usr/bin/env python3
import os, sys, json, time, pathlib, requests, subprocess, tempfile

API = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}/stream"
KEY = os.environ.get("ELEVEN_API_KEY")
if not KEY: sys.exit("ELEVEN_API_KEY not set")

def tts_segment(voice_id:str, text:str, out_wav:str, model="eleven_turbo_v2"):
    headers = {"xi-api-key": KEY, "Accept":"audio/wav", "Content-Type":"application/json"}
    body = {
        "text": text,
        "model_id": model,
        "voice_settings": {"stability": 0.4, "similarity_boost": 0.8, "style": 0.2, "use_speaker_boost": True}
    }
    with requests.post(API.format(voice_id=voice_id), headers=headers, json=body, stream=True, timeout=120) as r:
        r.raise_for_status()
        with open(out_wav,"wb") as f:
            for chunk in r.iter_content(65536):
                if chunk: f.write(chunk)
    # force 44.1k stereo PCM
    subprocess.run(["ffmpeg","-y","-v","error","-i",out_wav,"-ar","44100","-ac","2","-sample_fmt","s16",out_wav], check=True)

def concat_wavs(wavs, out_wav):
    # glitch-free concat
    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".txt") as listfile:
        for w in wavs: listfile.write(f"file '{pathlib.Path(w).as_posix()}'\n")
        path = listfile.name
    subprocess.run(["ffmpeg","-y","-v","error","-f","concat","-safe","0","-i",path,"-c","copy",out_wav], check=True)
    os.remove(path)
