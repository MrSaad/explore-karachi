// All sound is synthesised with the Web Audio API — no audio files needed.
// Rickshaw two-stroke putter, horn, footsteps, waves, city hum, discovery chime.
export class AudioSystem {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.engine = null;
  }

  /** Must be called from a user gesture (click/keypress). */
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.7;
    this.master.connect(ctx.destination);
    this.noise = this._noiseBuffer();
    this._startAmbience();
    this._startEngine();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.setTargetAtTime(m ? 0 : 0.7, this.ctx.currentTime, 0.05);
  }

  _noiseBuffer() {
    const ctx = this.ctx;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      // brown-ish noise
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      d[i] = last * 3.5;
    }
    return buf;
  }

  _loopNoise(filterType, freq, q = 0.7) {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = filterType;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.value = 0;
    src.connect(f).connect(g).connect(this.master);
    src.start();
    return { src, filter: f, gain: g };
  }

  _startAmbience() {
    // waves: low-passed noise with slow swells
    this.waves = this._loopNoise('lowpass', 500, 0.5);
    // city hum: band-passed rumble
    this.city = this._loopNoise('bandpass', 220, 0.6);
    this.nextHorn = 3;
  }

  _startEngine() {
    const ctx = this.ctx;
    // two-stroke "putt-putt": a buzzy oscillator chopped by a fast LFO
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = 55;
    const shaper = ctx.createBiquadFilter();
    shaper.type = 'lowpass';
    shaper.frequency.value = 700;
    const chop = ctx.createGain();
    chop.gain.value = 0.5;
    const lfo = ctx.createOscillator();
    lfo.type = 'square';
    lfo.frequency.value = 18;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.5;
    lfo.connect(lfoGain).connect(chop.gain);
    const out = ctx.createGain();
    out.gain.value = 0;
    osc.connect(shaper).connect(chop).connect(out).connect(this.master);
    osc.start();
    lfo.start();
    this.engine = { osc, lfo, out, shaper };
  }

  /**
   * Per-frame update with game state:
   * { driving, speed (0..1), nearSea (0..1), density (0..1) }
   */
  update(dt, s) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const e = this.engine;
    if (s.driving) {
      e.out.gain.setTargetAtTime(0.13 + s.speed * 0.07, t, 0.1);
      e.osc.frequency.setTargetAtTime(48 + s.speed * 70, t, 0.1);
      e.lfo.frequency.setTargetAtTime(14 + s.speed * 26, t, 0.1);
      e.shaper.frequency.setTargetAtTime(500 + s.speed * 900, t, 0.1);
    } else {
      e.out.gain.setTargetAtTime(0, t, 0.15);
    }
    const swell = 0.6 + 0.4 * Math.sin(t * 0.7) * Math.sin(t * 0.23 + 1);
    this.waves.gain.gain.setTargetAtTime(s.nearSea * 0.5 * swell, t, 0.3);
    this.city.gain.gain.setTargetAtTime(0.05 + s.density * 0.12, t, 0.5);

    // distant horns now and then — this is Karachi after all
    this.nextHorn -= dt;
    if (this.nextHorn <= 0) {
      this.nextHorn = 3 + Math.random() * 7 * (1.2 - s.density);
      if (s.density > 0.2)
        this.horn(0.05 + Math.random() * 0.06, 300 + Math.random() * 250, 0.12 + Math.random() * 0.2);
    }
  }

  horn(volume = 0.25, freq = 420, dur = 0.35) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(volume, t + 0.02);
    g.gain.setValueAtTime(volume, t + dur);
    g.gain.linearRampToValueAtTime(0, t + dur + 0.06);
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 2200;
    for (const mult of [1, 1.26]) {
      const o = ctx.createOscillator();
      o.type = 'square';
      o.frequency.value = freq * mult;
      o.connect(f);
      o.start(t);
      o.stop(t + dur + 0.1);
    }
    f.connect(g).connect(this.master);
  }

  /** The rickshaw's own horn: two quick toots. */
  playerHorn() {
    this.horn(0.22, 470, 0.13);
    setTimeout(() => this.horn(0.22, 470, 0.2), 170);
  }

  step(surface = 1) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 900 + Math.random() * 400;
    f.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0, t);
    g.gain.linearRampToValueAtTime(0.09 * surface, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    src.connect(f).connect(g).connect(this.master);
    src.start(t, Math.random());
    src.stop(t + 0.12);
  }

  bump() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.2);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.3);
  }

  /** Bright little arpeggio when a new place is discovered. */
  chime() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
      const t = t0 + i * 0.09;
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.16, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
      o.connect(g).connect(this.master);
      o.start(t);
      o.stop(t + 0.8);
    });
  }

  click() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(900, t);
    o.frequency.exponentialRampToValueAtTime(500, t + 0.06);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.1);
  }

  whoosh() {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 0.8;
    f.frequency.setValueAtTime(300, t);
    f.frequency.exponentialRampToValueAtTime(2400, t + 0.5);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.4, t + 0.15);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.7);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + 0.8);
  }
}
