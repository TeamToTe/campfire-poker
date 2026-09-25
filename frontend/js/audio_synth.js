/**
 * 8-Bit Retro Sound Effects & Campfire Atmosphere Synthesizer (Web Audio API)
 */

class AudioSynth {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.ambientPlaying = false;
    this.ambientInterval = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
  }

  // Card Deal Slide SFX
  playCardDeal() {
    if (this.muted) return;
    this.init();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(520, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(140, this.ctx.currentTime + 0.09);

    gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.09);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.09);
  }

  // Realistic Chip Toss / Clack SFX
  playChipStack() {
    if (this.muted) return;
    this.init();

    const now = this.ctx.currentTime;
    const clacks = [
      { freq: 880, delay: 0.00, dur: 0.035, vol: 0.12 },
      { freq: 1320, delay: 0.04, dur: 0.040, vol: 0.14 },
      { freq: 950, delay: 0.07, dur: 0.030, vol: 0.08 }
    ];

    clacks.forEach(c => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(c.freq, now + c.delay);
      gain.gain.setValueAtTime(c.vol, now + c.delay);
      gain.gain.linearRampToValueAtTime(0.01, now + c.delay + c.dur);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + c.delay);
      osc.stop(now + c.delay + c.dur);
    });
  }

  // Fold Swoosh SFX
  playFold() {
    if (this.muted) return;
    this.init();

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(240, this.ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(70, this.ctx.currentTime + 0.16);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, this.ctx.currentTime + 0.16);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.16);
  }

  // All-In Dramatic Sound
  playAllIn() {
    if (this.muted) return;
    this.init();

    const now = this.ctx.currentTime;
    const notes = [220, 330, 440, 660, 880];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.05);
      gain.gain.setValueAtTime(0.15, now + idx * 0.05);
      gain.gain.linearRampToValueAtTime(0.01, now + idx * 0.05 + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.05);
      osc.stop(now + idx * 0.05 + 0.12);
    });
  }

  // 8-Bit Victory Fanfare SFX
  playWinFanfare() {
    if (this.muted) return;
    this.init();

    const notes = [
      { f: 523.25, d: 0.10 }, // C5
      { f: 659.25, d: 0.10 }, // E5
      { f: 783.99, d: 0.10 }, // G5
      { f: 1046.50, d: 0.28 } // C6
    ];

    let timeOffset = 0;
    const now = this.ctx.currentTime;

    notes.forEach((n) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'square';
      osc.frequency.setValueAtTime(n.f, now + timeOffset);

      gain.gain.setValueAtTime(0.16, now + timeOffset);
      gain.gain.linearRampToValueAtTime(0.01, now + timeOffset + n.d);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + timeOffset);
      osc.stop(now + timeOffset + n.d);

      timeOffset += n.d * 0.85;
    });
  }

  // Ambient Campfire Crackle & Nature
  playCracklePop() {
    if (this.muted || !this.ctx) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(80 + Math.random() * 400, now);

    gain.gain.setValueAtTime(0.025 + Math.random() * 0.035, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.03 + Math.random() * 0.04);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  startAmbientAtmosphere() {
    if (this.ambientInterval) return;
    this.ambientInterval = setInterval(() => {
      if (!this.muted && Math.random() > 0.4) {
        this.playCracklePop();
      }
    }, 450);
  }

  stopAmbientAtmosphere() {
    if (this.ambientInterval) {
      clearInterval(this.ambientInterval);
      this.ambientInterval = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.muted) {
      this.stopAmbientAtmosphere();
    } else {
      this.init();
      this.startAmbientAtmosphere();
    }
    return this.muted;
  }
}

window.AudioSynth = new AudioSynth();
