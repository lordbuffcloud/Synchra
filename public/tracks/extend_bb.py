#!/usr/bin/env python3
import argparse, os, subprocess, sys, wave, math, tempfile, json
import numpy as np

SR = 44100

def hhmmss_to_sec(s):
    if isinstance(s, (int, float)): return float(s)
    parts = s.split(":")
    parts = [float(p) for p in parts]
    if len(parts)==3:
        h,m,x = parts; return h*3600 + m*60 + x
    elif len(parts)==2:
        m,x = parts; return m*60 + x
    else:
        return float(parts[0])

def run(cmd):
    subprocess.run(cmd, check=True)

def decode_to_wav(inp, wav_path):
    run(["ffmpeg","-y","-hide_banner","-loglevel","error","-i",inp,"-ar",str(SR),"-ac","2","-sample_fmt","s16", wav_path])

def encode_all(wav_path, out_webm, out_m4a, opus_kbps=128, aac_kbps=192):
    run(["ffmpeg","-y","-hide_banner","-loglevel","error","-i",wav_path,"-c:a","libopus","-b:a",f"{opus_kbps}k","-ac","2", out_webm])
    run(["ffmpeg","-y","-hide_banner","-loglevel","error","-i",wav_path,"-c:a","aac","-b:a",f"{aac_kbps}k","-movflags","+faststart", out_m4a])

def read_wav(path):
    with wave.open(path, 'rb') as w:
        assert w.getnchannels()==2, "expected stereo"
        assert w.getframerate()==SR, f"expected {SR} Hz"
        assert w.getsampwidth()==2, "expected 16-bit PCM"
        frames = w.getnframes()
        raw = w.readframes(frames)
    x = np.frombuffer(raw, dtype=np.int16).astype(np.float64) / 32767.0
    L = x[0::2].copy(); R = x[1::2].copy()
    return L,R

def write_wav(path, L, R):
    inter = np.empty(L.size+R.size, dtype=np.int16)
    inter[0::2] = np.clip(L, -1.0, 1.0)*32767.0
    inter[1::2] = np.clip(R, -1.0, 1.0)*32767.0
    inter = inter.astype(np.int16)
    with wave.open(path, 'wb') as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes(inter.tobytes())

def equal_power_xfade(aL, aR, bL, bR, xfade_s):
    n = int(SR*xfade_s)
    if n<=0:
        return np.concatenate([aL,bL]), np.concatenate([aR,bR])
    # overlap last n of a with first n of b
    aLh, aRh = aL[:-n], aR[:-n]
    bLt, bRt = bL[n:], bR[n:]
    t = np.linspace(0.0, 1.0, n, endpoint=True)
    # equal-power curves
    wA = np.cos(t*math.pi/2.0)
    wB = np.sin(t*math.pi/2.0)
    midL = aL[-n:]*wA + bL[:n]*wB
    midR = aR[-n:]*wA + bR[:n]*wB
    outL = np.concatenate([aLh, midL, bLt]); outR = np.concatenate([aRh, midR, bRt])
    return outL, outR

def extend_audio(inp, target_min, outdir, loop_start=None, loop_end=None, xfade_s=5.0, opus_kbps=128, aac_kbps=192, keep_wav=False):
    os.makedirs(outdir, exist_ok=True)
    base = os.path.splitext(os.path.basename(inp))[0]
    with tempfile.TemporaryDirectory() as td:
        wav_in = os.path.join(td, "in.wav")
        decode_to_wav(inp, wav_in)
        L, R = read_wav(wav_in)
        total_s = len(L)/SR
        # choose loop window
        if loop_start is None or loop_end is None:
            # default: middle 50% of the file (safe for steady-state beats)
            loop_start = total_s*0.25
            loop_end   = total_s*0.75
        ls = hhmmss_to_sec(loop_start); le = hhmmss_to_sec(loop_end)
        assert le > ls + xfade_s, "loop_end must be > loop_start + xfade_s"
        headL = L[:int(ls*SR)]; headR = R[:int(ls*SR)]
        bodyL = L[int(ls*SR):int(le*SR)]; bodyR = R[int(ls*SR):int(le*SR)]
        tailL = L[int(le*SR):]; tailR = R[int(le*SR):]

        # build up to target length
        target_s = int(target_min*60)
        outL, outR = headL.copy(), headR.copy()
        # loop body as many times as needed
        while len(outL)/SR + len(tailL)/SR < target_s:
            outL, outR = equal_power_xfade(outL, outR, bodyL, bodyR, xfade_s)
        # add tail with final crossfade
        outL, outR = equal_power_xfade(outL, outR, tailL, tailR, xfade_s)

        # trim or pad to exact length
        want = target_s*SR
        if len(outL) > want:
            outL = outL[:want]; outR = outR[:want]
        elif len(outL) < want:
            pad = want - len(outL)
            outL = np.concatenate([outL, np.zeros(pad)])
            outR = np.concatenate([outR, np.zeros(pad)])

        # write wav
        wav_out = os.path.join(outdir, f"{base}_{target_min}min.wav")
        write_wav(wav_out, outL, outR)
        # encode
        webm = os.path.join(outdir, f"{base}_{target_min}min.webm")
        m4a  = os.path.join(outdir, f"{base}_{target_min}min.m4a")
        encode_all(wav_out, webm, m4a, opus_kbps=opus_kbps, aac_kbps=aac_kbps)
        if not keep_wav:
            try: os.remove(wav_out)
            except: pass
        # emit manifest item
        manifest = {
            "id": base.lower().replace(" ","-"),
            "title": base.replace("_"," "),
            "filenameWebm": os.path.basename(webm),
            "filenameAac": os.path.basename(m4a),
            "durationSec": target_min*60
        }
        return webm, m4a, manifest

def main():
    ap = argparse.ArgumentParser(description="Extend BB audio to a longer duration via seamless loop crossfades.")
    ap.add_argument("--in", dest="inp", required=True, help="input file (.webm/.m4a/.wav)")
    ap.add_argument("--outdir", default="extended_out")
    ap.add_argument("--minutes", type=int, required=True, help="target minutes (e.g., 30, 45, 60, 90)")
    ap.add_argument("--loop-start", default=None, help="loop start (sec or HH:MM:SS). Default: mid 25%")
    ap.add_argument("--loop-end", default=None, help="loop end (sec or HH:MM:SS). Default: mid 75%")
    ap.add_argument("--xfade", type=float, default=5.0, help="crossfade seconds (default 5)")
    ap.add_argument("--opus-kbps", type=int, default=128)
    ap.add_argument("--aac-kbps", type=int, default=192)
    ap.add_argument("--keep-wav", action="store_true")
    args = ap.parse_args()
    webm, m4a, manifest = extend_audio(args.inp, args.minutes, args.outdir, args.loop_start, args.loop_end, args.xfade, args.opus_kbps, args.aac_kbps, args.keep_wav)
    print(json.dumps({"webm": webm, "m4a": m4a, "manifest": manifest}, indent=2))

if __name__=="__main__":
    main()
