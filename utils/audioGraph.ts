export class AudioGraph {
  private audioContext: AudioContext
  private limiter: DynamicsCompressorNode
  private masterGain: GainNode
  private crossfader: CrossfadeNode
  
  constructor() {
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    this.setupNodes()
  }

  private setupNodes() {
    // Master gain control
    this.masterGain = this.audioContext.createGain()
    this.masterGain.gain.value = 0.7

    // Limiter to prevent clipping
    this.limiter = this.audioContext.createDynamicsCompressor()
    this.limiter.threshold.value = -6
    this.limiter.knee.value = 5
    this.limiter.ratio.value = 12
    this.limiter.attack.value = 0.003
    this.limiter.release.value = 0.25

    // Crossfader for smooth transitions
    this.crossfader = new CrossfadeNode(this.audioContext)

    // Connect the chain
    this.crossfader.connect(this.masterGain)
    this.masterGain.connect(this.limiter)
    this.limiter.connect(this.audioContext.destination)
  }

  getContext(): AudioContext {
    return this.audioContext
  }

  getMasterGain(): GainNode {
    return this.masterGain
  }

  getCrossfader(): CrossfadeNode {
    return this.crossfader
  }

  async resume() {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume()
    }
  }

  setVolume(value: number) {
    const now = this.audioContext.currentTime
    this.masterGain.gain.setTargetAtTime(value, now, 0.1)
  }

  applyNormalization(source: AudioNode, gainDb: number): AudioNode {
    if (!gainDb) return source

    const gainNode = this.audioContext.createGain()
    const linearGain = Math.pow(10, gainDb / 20)
    gainNode.gain.value = linearGain

    source.connect(gainNode)
    return gainNode
  }

  createMediaElementSource(element: HTMLMediaElement): MediaElementAudioSourceNode {
    return this.audioContext.createMediaElementSource(element)
  }
}

export class CrossfadeNode {
  private audioContext: AudioContext
  private inputA: GainNode
  private inputB: GainNode
  private outputNode: GainNode
  private currentInput: 'A' | 'B' = 'A'

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext
    this.setupNodes()
  }

  private setupNodes() {
    this.inputA = this.audioContext.createGain()
    this.inputB = this.audioContext.createGain()
    this.outputNode = this.audioContext.createGain()

    // Initially only input A is audible
    this.inputA.gain.value = 1
    this.inputB.gain.value = 0

    // Connect to output
    this.inputA.connect(this.outputNode)
    this.inputB.connect(this.outputNode)
  }

  getInputA(): GainNode {
    return this.inputA
  }

  getInputB(): GainNode {
    return this.inputB
  }

  connect(destination: AudioNode) {
    this.outputNode.connect(destination)
  }

  async crossfade(durationSeconds: number = 3) {
    const now = this.audioContext.currentTime
    
    if (this.currentInput === 'A') {
      // Fade A out, B in
      this.inputA.gain.setTargetAtTime(0, now, durationSeconds / 3)
      this.inputB.gain.setTargetAtTime(1, now, durationSeconds / 3)
      this.currentInput = 'B'
    } else {
      // Fade B out, A in
      this.inputB.gain.setTargetAtTime(0, now, durationSeconds / 3)
      this.inputA.gain.setTargetAtTime(1, now, durationSeconds / 3)
      this.currentInput = 'A'
    }

    return new Promise<void>(resolve => {
      setTimeout(resolve, durationSeconds * 1000)
    })
  }

  getCurrentInput(): 'A' | 'B' {
    return this.currentInput
  }

  getInactiveInput(): GainNode {
    return this.currentInput === 'A' ? this.inputB : this.inputA
  }

  getActiveInput(): GainNode {
    return this.currentInput === 'A' ? this.inputA : this.inputB
  }
}

export class NoiseGenerator {
  private audioContext: AudioContext
  private bufferSize = 4096
  private noiseBuffer: AudioBuffer
  private sourceNode?: AudioBufferSourceNode
  private gainNode: GainNode
  private filterNode: BiquadFilterNode
  private noiseType: 'pink' | 'brown' | 'white' = 'pink'

  constructor(audioContext: AudioContext) {
    this.audioContext = audioContext
    this.setupNodes()
    this.generateNoiseBuffer()
  }

  private setupNodes() {
    this.gainNode = this.audioContext.createGain()
    this.gainNode.gain.value = 0

    this.filterNode = this.audioContext.createBiquadFilter()
    this.filterNode.type = 'lowpass'
    this.filterNode.frequency.value = 8000

    this.filterNode.connect(this.gainNode)
  }

  private generateNoiseBuffer() {
    this.noiseBuffer = this.audioContext.createBuffer(2, this.bufferSize, this.audioContext.sampleRate)
    
    for (let channel = 0; channel < this.noiseBuffer.numberOfChannels; channel++) {
      const channelData = this.noiseBuffer.getChannelData(channel)
      
      switch (this.noiseType) {
        case 'white':
          this.generateWhiteNoise(channelData)
          break
        case 'pink':
          this.generatePinkNoise(channelData)
          break
        case 'brown':
          this.generateBrownNoise(channelData)
          break
      }
    }
  }

  private generateWhiteNoise(channelData: Float32Array) {
    for (let i = 0; i < channelData.length; i++) {
      channelData[i] = Math.random() * 2 - 1
    }
  }

  private generatePinkNoise(channelData: Float32Array) {
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
    
    for (let i = 0; i < channelData.length; i++) {
      const white = Math.random() * 2 - 1
      b0 = 0.99886 * b0 + white * 0.0555179
      b1 = 0.99332 * b1 + white * 0.0750759
      b2 = 0.96900 * b2 + white * 0.1538520
      b3 = 0.86650 * b3 + white * 0.3104856
      b4 = 0.55000 * b4 + white * 0.5329522
      b5 = -0.7616 * b5 - white * 0.0168980
      channelData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11
      b6 = white * 0.115926
    }
  }

  private generateBrownNoise(channelData: Float32Array) {
    let lastOut = 0
    for (let i = 0; i < channelData.length; i++) {
      const white = Math.random() * 2 - 1
      channelData[i] = lastOut = (lastOut + (0.02 * white)) / 1.02
    }
  }

  setType(type: 'pink' | 'brown' | 'white') {
    this.noiseType = type
    this.generateNoiseBuffer()
    if (this.sourceNode) {
      this.stop()
      this.start()
    }
  }

  start() {
    if (this.sourceNode) {
      this.sourceNode.stop()
    }

    this.sourceNode = this.audioContext.createBufferSource()
    this.sourceNode.buffer = this.noiseBuffer
    this.sourceNode.loop = true
    this.sourceNode.connect(this.filterNode)
    this.sourceNode.start()
  }

  stop() {
    if (this.sourceNode) {
      this.sourceNode.stop()
      this.sourceNode = undefined
    }
  }

  setVolume(value: number) {
    const now = this.audioContext.currentTime
    this.gainNode.gain.setTargetAtTime(value, now, 0.1)
  }

  connect(destination: AudioNode) {
    this.gainNode.connect(destination)
  }
}