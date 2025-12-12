export type BinauralPreset = {
  id: string
  name: string
  description: string
  beatHz: number
  baseHz: number
  // Optional: gentle ramp between two beat frequencies (start → end over seconds).
  ramp?: { fromHz: number; toHz: number; seconds: number }
  // Optional: breath/HRV envelope (0.1 Hz default) applied to overall level (subtle).
  hrvHz?: number
  // Optional: output amplitude modulation (very subtle). (Gamma 40 Hz is a common case.)
  outAmHz?: number
  outAmDepth?: number
  // Back-compat field kept for convenience.
  gammaAmHz?: number
  // Optional: micro interaural time delay drift (ms peak).
  microItdMs?: number
  // Optional: hemispheric alternator (swap/seconds). Modulates left/right balance slowly.
  hemiSwapSeconds?: number
  // Optional: noise-bed amplitude modulation; targets the store's noise bus if provided.
  noiseAmHz?: number
  noiseAmDepth?: number
}

export class BinauralBeatSynth {
  private ctx: AudioContext
  private destination: AudioNode
  private noiseBus?: GainNode

  private leftOsc?: OscillatorNode
  private rightOsc?: OscillatorNode
  private leftPan?: StereoPannerNode
  private rightPan?: StereoPannerNode
  private leftGain?: GainNode
  private rightGain?: GainNode
  private outGain?: GainNode

  private hrvOsc?: OscillatorNode
  private hrvGain?: GainNode

  private outAmOsc?: OscillatorNode
  private outAmGain?: GainNode

  private itdOsc?: OscillatorNode
  private rightDelay?: DelayNode
  private itdDepth?: GainNode

  private hemiOsc?: OscillatorNode
  private hemiDepthL?: GainNode
  private hemiDepthR?: GainNode

  private noiseAmOsc?: OscillatorNode
  private noiseAmGain?: GainNode

  private started = false

  constructor(ctx: AudioContext, destination: AudioNode, opts?: { noiseBus?: GainNode }) {
    this.ctx = ctx
    this.destination = destination
    this.noiseBus = opts?.noiseBus
  }

  isStarted(): boolean {
    return this.started
  }

  start(preset: BinauralPreset, initialLevel: number = 0.18) {
    if (this.started) return

    const now = this.ctx.currentTime

    // Output gain with a soft fade-in (hearing safety + click avoidance).
    this.outGain = this.ctx.createGain()
    this.outGain.gain.setValueAtTime(0, now)
    this.outGain.gain.linearRampToValueAtTime(Math.max(0, Math.min(initialLevel, 0.35)), now + 0.25)
    this.outGain.connect(this.destination)

    // Per-ear chain
    this.leftOsc = this.ctx.createOscillator()
    this.rightOsc = this.ctx.createOscillator()
    this.leftOsc.type = 'sine'
    this.rightOsc.type = 'sine'

    this.leftGain = this.ctx.createGain()
    this.rightGain = this.ctx.createGain()
    // Keep headroom; we later modulate gains for hemispheric alternation.
    this.leftGain.gain.value = 0.75
    this.rightGain.gain.value = 0.75

    // Hard pan for binaural separation
    this.leftPan = this.ctx.createStereoPanner()
    this.rightPan = this.ctx.createStereoPanner()
    this.leftPan.pan.value = -1
    this.rightPan.pan.value = 1

    // Optional micro-ITD: a tiny, slow delay modulation on the right ear only.
    this.rightDelay = this.ctx.createDelay(0.02)
    this.rightDelay.delayTime.value = 0
    this.itdDepth = this.ctx.createGain()
    this.itdDepth.gain.value = 0

    // Wire left: osc → gain → pan → out
    this.leftOsc.connect(this.leftGain)
    this.leftGain.connect(this.leftPan)
    this.leftPan.connect(this.outGain)

    // Wire right: osc → gain → delay → pan → out
    this.rightOsc.connect(this.rightGain)
    this.rightGain.connect(this.rightDelay)
    this.rightDelay.connect(this.rightPan)
    this.rightPan.connect(this.outGain)

    // Optional HRV envelope (subtle AM on output)
    this.hrvGain = this.ctx.createGain()
    this.hrvGain.gain.value = 0
    this.hrvGain.connect(this.outGain.gain)

    // Optional output AM (subtle AM on output)
    this.outAmGain = this.ctx.createGain()
    this.outAmGain.gain.value = 0
    this.outAmGain.connect(this.outGain.gain)

    // Optional ITD drift: modulate rightDelay.delayTime
    this.itdOsc = this.ctx.createOscillator()
    this.itdOsc.type = 'sine'
    this.itdOsc.frequency.value = 0.01 // ultra slow drift
    this.itdDepth.connect(this.rightDelay.delayTime)
    this.itdOsc.connect(this.itdDepth)

    // Optional hemi-alternator: LFO into left and inverse into right.
    this.hemiDepthL = this.ctx.createGain()
    this.hemiDepthR = this.ctx.createGain()
    this.hemiDepthL.gain.value = 0
    this.hemiDepthR.gain.value = 0
    this.hemiDepthL.connect(this.leftGain.gain)
    this.hemiDepthR.connect(this.rightGain.gain)

    this.hemiOsc = this.ctx.createOscillator()
    this.hemiOsc.type = 'sine'
    this.hemiOsc.frequency.value = 0 // disabled until preset asks
    this.hemiOsc.connect(this.hemiDepthL)
    this.hemiOsc.connect(this.hemiDepthR)
    this.hemiOsc.start()

    // Optional noise-bed AM: targets store noise bus if provided.
    if (this.noiseBus) {
      this.noiseAmGain = this.ctx.createGain()
      this.noiseAmGain.gain.value = 0
      this.noiseAmGain.connect(this.noiseBus.gain)
      this.noiseAmOsc = this.ctx.createOscillator()
      this.noiseAmOsc.type = 'sine'
      this.noiseAmOsc.frequency.value = 0
      this.noiseAmOsc.connect(this.noiseAmGain)
      this.noiseAmOsc.start()
    }

    this.applyPreset(preset)

    this.leftOsc.start()
    this.rightOsc.start()
    this.itdOsc.start()

    this.started = true
  }

  setOutputLevel(nextLevel: number) {
    if (!this.outGain) return
    const v = Math.max(0, Math.min(nextLevel, 0.35))
    const now = this.ctx.currentTime
    this.outGain.gain.setTargetAtTime(v, now, 0.05)
  }

  stop() {
    if (!this.started) return
    const now = this.ctx.currentTime

    if (this.outGain) {
      const current = this.outGain.gain.value
      this.outGain.gain.setValueAtTime(current, now)
      this.outGain.gain.linearRampToValueAtTime(0, now + 0.2)
    }

    const stopNode = (n?: OscillatorNode) => {
      if (!n) return
      try {
        n.stop(now + 0.25)
      } catch {
        // ignore
      }
    }

    stopNode(this.leftOsc)
    stopNode(this.rightOsc)
    stopNode(this.hrvOsc)
    stopNode(this.outAmOsc)
    stopNode(this.itdOsc)
    stopNode(this.hemiOsc)
    stopNode(this.noiseAmOsc)

    // Disconnect a bit later (after fade)
    window.setTimeout(() => {
      ;[
        this.leftOsc,
        this.rightOsc,
        this.leftPan,
        this.rightPan,
        this.leftGain,
        this.rightGain,
        this.outGain,
        this.hrvOsc,
        this.hrvGain,
        this.outAmOsc,
        this.outAmGain,
        this.itdOsc,
        this.rightDelay,
        this.itdDepth,
        this.hemiOsc,
        this.hemiDepthL,
        this.hemiDepthR,
        this.noiseAmOsc,
        this.noiseAmGain,
      ].forEach((n: any) => {
        try {
          n?.disconnect?.()
        } catch {
          // ignore
        }
      })

      this.leftOsc = undefined
      this.rightOsc = undefined
      this.leftPan = undefined
      this.rightPan = undefined
      this.leftGain = undefined
      this.rightGain = undefined
      this.outGain = undefined
      this.hrvOsc = undefined
      this.hrvGain = undefined
      this.outAmOsc = undefined
      this.outAmGain = undefined
      this.itdOsc = undefined
      this.rightDelay = undefined
      this.itdDepth = undefined
      this.hemiOsc = undefined
      this.hemiDepthL = undefined
      this.hemiDepthR = undefined
      this.noiseAmOsc = undefined
      this.noiseAmGain = undefined
      this.started = false
    }, 300)
  }

  applyPreset(preset: BinauralPreset) {
    if (!this.leftOsc || !this.rightOsc) return

    const now = this.ctx.currentTime
    const base = preset.baseHz
    const beat = preset.beatHz

    // Default binaural method: base ± beat/2
    const leftHz = Math.max(20, base - beat / 2)
    const rightHz = Math.max(20, base + beat / 2)

    this.leftOsc.frequency.setTargetAtTime(leftHz, now, 0.02)
    this.rightOsc.frequency.setTargetAtTime(rightHz, now, 0.02)

    // Optional ramp: smooth beat change over time by adjusting both oscillators.
    if (preset.ramp) {
      const { fromHz, toHz, seconds } = preset.ramp
      const fromLeft = Math.max(20, base - fromHz / 2)
      const fromRight = Math.max(20, base + fromHz / 2)
      const toLeft = Math.max(20, base - toHz / 2)
      const toRight = Math.max(20, base + toHz / 2)
      this.leftOsc.frequency.setValueAtTime(fromLeft, now)
      this.rightOsc.frequency.setValueAtTime(fromRight, now)
      this.leftOsc.frequency.linearRampToValueAtTime(toLeft, now + seconds)
      this.rightOsc.frequency.linearRampToValueAtTime(toRight, now + seconds)
    }

    // HRV envelope (0.1 Hz default). Adds a small +/- modulation to output gain.
    const hrvHz = preset.hrvHz ?? 0
    if (this.hrvGain) {
      this.hrvGain.gain.setTargetAtTime(hrvHz ? 0.03 : 0, now, 0.05)
    }
    if (hrvHz) {
      if (!this.hrvOsc) {
        this.hrvOsc = this.ctx.createOscillator()
        this.hrvOsc.type = 'sine'
        this.hrvOsc.connect(this.hrvGain!)
        this.hrvOsc.start()
      }
      this.hrvOsc.frequency.setTargetAtTime(hrvHz, now, 0.1)
    } else if (this.hrvOsc) {
      try {
        this.hrvOsc.stop(now + 0.1)
      } catch {
        // ignore
      }
      this.hrvOsc = undefined
    }

    // Output AM (gamma is common). Small tremolo for “CFC flavor”.
    const outAmHz = preset.outAmHz ?? preset.gammaAmHz ?? 0
    const outAmDepth = preset.outAmDepth ?? 0.015
    if (this.outAmGain) {
      this.outAmGain.gain.setTargetAtTime(outAmHz ? outAmDepth : 0, now, 0.05)
    }
    if (outAmHz) {
      if (!this.outAmOsc) {
        this.outAmOsc = this.ctx.createOscillator()
        this.outAmOsc.type = 'sine'
        this.outAmOsc.connect(this.outAmGain!)
        this.outAmOsc.start()
      }
      this.outAmOsc.frequency.setTargetAtTime(outAmHz, now, 0.02)
    } else if (this.outAmOsc) {
      try {
        this.outAmOsc.stop(now + 0.1)
      } catch {
        // ignore
      }
      this.outAmOsc = undefined
    }

    // Micro-ITD: depth in seconds (ms → s)
    const itdMs = preset.microItdMs ?? 0
    if (this.itdDepth) {
      const depthSeconds = Math.max(0, Math.min(itdMs, 5)) / 1000
      this.itdDepth.gain.setTargetAtTime(depthSeconds, now, 0.2)
    }

    // Hemi alternator: swap/seconds (approx). We use a sine LFO and invert it for R.
    const hemiSwapSeconds = preset.hemiSwapSeconds ?? 0
    if (this.hemiOsc && this.hemiDepthL && this.hemiDepthR) {
      if (hemiSwapSeconds) {
        const hz = Math.max(0.001, 1 / (hemiSwapSeconds * 2)) // half-cycle ~ one side emphasis
        const depth = 0.18 // keep safe; avoids negative gain
        this.hemiDepthL.gain.setTargetAtTime(depth, now, 0.2)
        this.hemiDepthR.gain.setTargetAtTime(-depth, now, 0.2)
        this.hemiOsc.frequency.setTargetAtTime(hz, now, 0.5)
      } else {
        this.hemiDepthL.gain.setTargetAtTime(0, now, 0.2)
        this.hemiDepthR.gain.setTargetAtTime(0, now, 0.2)
        this.hemiOsc.frequency.setTargetAtTime(0, now, 0.5)
      }
    }

    // Noise AM: requires a noise bus reference.
    const noiseAmHz = preset.noiseAmHz ?? 0
    const noiseAmDepth = preset.noiseAmDepth ?? 0.06
    if (this.noiseAmOsc && this.noiseAmGain) {
      this.noiseAmGain.gain.setTargetAtTime(noiseAmHz ? noiseAmDepth : 0, now, 0.1)
      this.noiseAmOsc.frequency.setTargetAtTime(noiseAmHz || 0, now, 0.1)
    }
  }
}


