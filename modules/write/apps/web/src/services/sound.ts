/**
 * Web Audio Sound Effects & Ambient Zen Engine for Japanese Writing Studio
 * Pure synthesizer audio (zero external asset requests).
 */

export type AmbientSoundType = 'rain' | 'shishi' | 'windchime' | 'zen'

class SoundEffectService {
  private ctx: AudioContext | null = null
  private muted: boolean = false
  private activeAmbientNodes: { stop: () => void } | null = null
  private currentAmbientType: AmbientSoundType | null = null

  constructor() {
    try {
      this.muted = localStorage.getItem('jw:sound_muted') === 'true'
    } catch {
      this.muted = false
    }
  }

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtx) {
        this.ctx = new AudioCtx()
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume()
    }
    return this.ctx
  }

  public isMuted(): boolean {
    return this.muted
  }

  public setMuted(muted: boolean): void {
    this.muted = muted
    if (muted) {
      this.stopAmbient()
    }
    try {
      localStorage.setItem('jw:sound_muted', String(muted))
    } catch {
      // storage unavailable
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted)
    return this.muted
  }

  /**
   * Subtle wood click (Mokugyo style tap)
   */
  public playClick(): void {
    if (this.muted) return
    const ctx = this.getContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(420, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(120, ctx.currentTime + 0.04)

    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.04)
  }

  public playSuccess(): void {
    this.playCorrectStroke()
  }

  public playNeutral(): void {
    this.playClick()
  }

  /**
   * Ultra-subtle ASMR brush on Washi paper rustle
   */
  public playWashiStroke(): void {
    if (this.muted) return
    const ctx = this.getContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(600 + Math.random() * 200, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.035)

    filter.type = 'bandpass'
    filter.frequency.setValueAtTime(1200, ctx.currentTime)

    gain.gain.setValueAtTime(0.025, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.035)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.035)
  }

  /**
   * Sharp Katana Sword Slash "Shing!" when completing a sentence
   */
  public playKatanaSlice(): void {
    if (this.muted) return
    const ctx = this.getContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    const filter = ctx.createBiquadFilter()

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(1800, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(3200, ctx.currentTime + 0.04)
    osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.12)

    filter.type = 'highpass'
    filter.frequency.setValueAtTime(1400, ctx.currentTime)

    gain.gain.setValueAtTime(0.12, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.15)

    osc.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.15)
  }

  /**
   * Heavy satisfying Hanko stamp (判子) thud
   */
  public playStamp(): void {
    if (this.muted) return
    const ctx = this.getContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(180, ctx.currentTime)
    osc.frequency.exponentialRampToValueAtTime(45, ctx.currentTime + 0.12)

    gain.gain.setValueAtTime(0.35, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.15)
  }

  /**
   * XP gain spark chime
   */
  public playXpGain(): void {
    if (this.muted) return
    const ctx = this.getContext()
    if (!ctx) return

    const freqs = [523.25, 659.25, 783.99, 1046.5] // C5, E5, G5, C6
    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      const startTime = ctx.currentTime + idx * 0.04
      osc.type = 'sine'
      osc.frequency.setValueAtTime(f, startTime)

      gain.gain.setValueAtTime(0.08, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(startTime)
      osc.stop(startTime + 0.18)
    })
  }

  /**
   * Japanese Wind Chime (風鈴 Fūrin) crystal bell
   */
  public playFurin(): void {
    if (this.muted) return
    const ctx = this.getContext()
    if (!ctx) return

    const freqs = [1760, 2637, 3520] // A6, E7, A7
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      const startTime = ctx.currentTime + idx * 0.03
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, startTime)

      gain.gain.setValueAtTime(0.09, startTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.8)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(startTime)
      osc.stop(startTime + 0.8)
    })
  }

  /**
   * Level up fanfare (Pentatonic Insen / Sakura harmonic scale)
   */
  public playLevelUp(): void {
    if (this.muted) return
    const ctx = this.getContext()
    if (!ctx) return

    const notes = [440, 466.16, 587.33, 659.25, 783.99, 880] // A4, Bb4, D5, E5, G5, A5
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      const startTime = ctx.currentTime + idx * 0.07
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, startTime)

      gain.gain.setValueAtTime(0.14, startTime)
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.45)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(startTime)
      osc.stop(startTime + 0.45)
    })
  }

  /**
   * Delicate harmonic chime when a Kanji stroke is drawn correctly
   */
  public playCorrectStroke(): void {
    if (this.muted) return
    const ctx = this.getContext()
    if (!ctx) return

    const freqs = [880, 1318.51] // A5, E6
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()

      const startTime = ctx.currentTime + idx * 0.035
      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, startTime)

      gain.gain.setValueAtTime(0.07, startTime)
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.22)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(startTime)
      osc.stop(startTime + 0.22)
    })
  }

  /**
   * Soft subtle wobble buzzer when stroke order or direction is incorrect
   */
  public playWrongStroke(): void {
    if (this.muted) return
    const ctx = this.getContext()
    if (!ctx) return

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(160, ctx.currentTime)
    osc.frequency.linearRampToValueAtTime(120, ctx.currentTime + 0.1)

    gain.gain.setValueAtTime(0.06, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.12)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start()
    osc.stop(ctx.currentTime + 0.12)
  }

  /* ---------------- Zen Ambient Soundscapes ---------------- */

  public isAmbientPlaying(): boolean {
    return this.activeAmbientNodes !== null
  }

  public getAmbientType(): AmbientSoundType | null {
    return this.currentAmbientType
  }

  public stopAmbient(): void {
    if (this.activeAmbientNodes) {
      try {
        this.activeAmbientNodes.stop()
      } catch {
        // ignore
      }
      this.activeAmbientNodes = null
      this.currentAmbientType = null
    }
  }

  public startAmbient(type: AmbientSoundType): void {
    this.stopAmbient()
    if (this.muted) return
    const ctx = this.getContext()
    if (!ctx) return

    this.currentAmbientType = type

    if (type === 'zen') {
      // Warm meditative 5th chord drone (A2 110Hz + E3 164.8Hz + A3 220Hz)
      const osc1 = ctx.createOscillator()
      const osc2 = ctx.createOscillator()
      const osc3 = ctx.createOscillator()
      const masterGain = ctx.createGain()
      const filter = ctx.createBiquadFilter()

      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(320, ctx.currentTime)

      osc1.type = 'sine'
      osc1.frequency.setValueAtTime(110, ctx.currentTime)
      osc2.type = 'sine'
      osc2.frequency.setValueAtTime(164.81, ctx.currentTime)
      osc3.type = 'sine'
      osc3.frequency.setValueAtTime(220, ctx.currentTime)

      masterGain.gain.setValueAtTime(0.001, ctx.currentTime)
      masterGain.gain.linearRampToValueAtTime(0.05, ctx.currentTime + 2)

      osc1.connect(filter)
      osc2.connect(filter)
      osc3.connect(filter)
      filter.connect(masterGain)
      masterGain.connect(ctx.destination)

      osc1.start()
      osc2.start()
      osc3.start()

      this.activeAmbientNodes = {
        stop: () => {
          try {
            masterGain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 1)
            setTimeout(() => {
              osc1.stop()
              osc2.stop()
              osc3.stop()
            }, 1000)
          } catch {
            // ignore
          }
        },
      }
    } else if (type === 'rain') {
      // Pink noise rain simulation
      const bufferSize = ctx.sampleRate * 2
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
      const output = noiseBuffer.getChannelData(0)
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1
        b0 = 0.99886 * b0 + white * 0.0555179
        b1 = 0.99332 * b1 + white * 0.0750759
        b2 = 0.96900 * b2 + white * 0.1538520
        b3 = 0.86650 * b3 + white * 0.3104856
        b4 = 0.55000 * b4 + white * 0.5329522
        b5 = -0.7616 * b5 - white * 0.0168980
        output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362
        output[i] *= 0.04
        b6 = white * 0.115926
      }

      const whiteNoise = ctx.createBufferSource()
      whiteNoise.buffer = noiseBuffer
      whiteNoise.loop = true

      const filter = ctx.createBiquadFilter()
      filter.type = 'lowpass'
      filter.frequency.setValueAtTime(800, ctx.currentTime)

      const masterGain = ctx.createGain()
      masterGain.gain.setValueAtTime(0.001, ctx.currentTime)
      masterGain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 1.5)

      whiteNoise.connect(filter)
      filter.connect(masterGain)
      masterGain.connect(ctx.destination)

      whiteNoise.start()

      this.activeAmbientNodes = {
        stop: () => {
          try {
            masterGain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.8)
            setTimeout(() => whiteNoise.stop(), 800)
          } catch {
            // ignore
          }
        },
      }
    } else {
      // Windchime / Shishi-odoshi periodic triggers
      const intervalId = window.setInterval(() => {
        if (type === 'shishi') {
          this.playClick()
        } else {
          this.playFurin()
        }
      }, 4000)

      this.activeAmbientNodes = {
        stop: () => {
          window.clearInterval(intervalId)
        },
      }
    }
  }
}

export const sound = new SoundEffectService()
