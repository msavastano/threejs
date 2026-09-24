// Web Audio API Procedural Audio Engine for Dyson Swarm Simulation

class SpaceAudioEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.5;
  private humGain: GainNode | null = null;
  private droneHumGain: GainNode | null = null;
  private isInitialized: boolean = false;

  public init() {
    if (this.isInitialized) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.setupAmbientHum();
      this.isInitialized = true;
    } catch (e) {
      console.warn('Web Audio API not supported', e);
    }
  }

  private setupAmbientHum() {
    if (!this.ctx) return;

    // Ambient Deep Space Stellar Engine Rumble
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    this.humGain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(42, this.ctx.currentTime); // Low deep pitch

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(84, this.ctx.currentTime);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(180, this.ctx.currentTime);

    this.humGain.gain.setValueAtTime(0.08 * (this.isMuted ? 0 : this.volume), this.ctx.currentTime);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(this.humGain);
    this.humGain.connect(this.ctx.destination);

    osc1.start();
    osc2.start();

    // Secondary Drone Swarm High Frequency Buzz Harmonic
    const droneOsc = this.ctx.createOscillator();
    const droneFilter = this.ctx.createBiquadFilter();
    this.droneHumGain = this.ctx.createGain();

    droneOsc.type = 'triangle';
    droneOsc.frequency.setValueAtTime(220, this.ctx.currentTime);

    droneFilter.type = 'bandpass';
    droneFilter.frequency.setValueAtTime(450, this.ctx.currentTime);
    droneFilter.Q.setValueAtTime(3, this.ctx.currentTime);

    this.droneHumGain.gain.setValueAtTime(0.015 * (this.isMuted ? 0 : this.volume), this.ctx.currentTime);

    droneOsc.connect(droneFilter);
    droneFilter.connect(this.droneHumGain);
    this.droneHumGain.connect(this.ctx.destination);

    droneOsc.start();
  }

  public setVolume(val: number) {
    this.volume = val;
    this.updateVolumes();
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    this.updateVolumes();
  }

  private updateVolumes() {
    if (!this.ctx) return;
    const effVol = this.isMuted ? 0 : this.volume;
    if (this.humGain) {
      this.humGain.gain.linearRampToValueAtTime(0.08 * effVol, this.ctx.currentTime + 0.1);
    }
    if (this.droneHumGain) {
      this.droneHumGain.gain.linearRampToValueAtTime(0.015 * effVol, this.ctx.currentTime + 0.1);
    }
  }

  public playLaserPing() {
    if (!this.ctx || this.isMuted || this.volume <= 0) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(220, this.ctx.currentTime + 0.12);

    gain.gain.setValueAtTime(0.05 * this.volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.13);
  }

  public playPhaseCompletion() {
    if (!this.ctx || this.isMuted || this.volume <= 0) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6 major arpeggio
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime + idx * 0.1);

      gain.gain.setValueAtTime(0.12 * this.volume, this.ctx.currentTime + idx * 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + idx * 0.1 + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(this.ctx.currentTime + idx * 0.1);
      osc.stop(this.ctx.currentTime + idx * 0.1 + 0.65);
    });
  }

  public playSolarFlareSiren() {
    if (!this.ctx || this.isMuted || this.volume <= 0) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(200, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(600, this.ctx.currentTime + 0.3);
    osc.frequency.linearRampToValueAtTime(200, this.ctx.currentTime + 0.6);

    gain.gain.setValueAtTime(0.1 * this.volume, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.6);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.61);
  }

  public playUIClick() {
    if (!this.ctx || this.isMuted || this.volume <= 0) return;
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.03);

    gain.gain.setValueAtTime(0.03 * this.volume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.04);
  }
}

export const spaceAudio = new SpaceAudioEngine();
