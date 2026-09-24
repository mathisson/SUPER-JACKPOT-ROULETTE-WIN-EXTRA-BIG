// Procedural Vegas big-band lobby loop, synthesised live with WebAudio (no audio files).
// Swung 132 BPM in C: muted-trumpet tune, brass stabs, walking bass, ride cymbal,
// and a slot-machine sparkle at the top of each chorus. Form: A A' B A' (16 bars).

const BPM = 132;
const BEAT = 60 / BPM;
const SWING = 0.66; // position of the off-beat eighth within a beat

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// { bass root, interval for the walking 2nd note, brass voicing }
const CHORDS = {
  C6:   { root: 36, walk: 4, voicing: [64, 67, 69, 72] },
  A7:   { root: 45, walk: 4, voicing: [61, 64, 67, 69] },
  Dm7:  { root: 38, walk: 3, voicing: [62, 65, 69, 72] },
  G7:   { root: 43, walk: 4, voicing: [65, 67, 71, 74] },
  F6:   { root: 41, walk: 4, voicing: [65, 69, 72, 74] },
  Fdim: { root: 42, walk: 3, voicing: [66, 69, 72, 75] }, // F#dim7
  CG:   { root: 43, walk: 5, voicing: [64, 67, 69, 72] }, // C6/G
};

// Melody phrases: [eighth position 0–7, midi note, length in eighths]
const PHRASES = {
  a1: [[0, 72, 1], [1, 74, 1], [2, 76, 2], [4, 79, 3]],
  a2: [[0, 76, 1], [1, 73, 1], [2, 76, 2], [4, 81, 2], [6, 79, 2]],
  a3: [[0, 77, 2], [2, 76, 1], [3, 74, 1], [4, 72, 2], [6, 69, 2]],
  a4: [[0, 71, 1], [1, 72, 1], [2, 74, 2], [4, 67, 4]],
  a4b: [[0, 74, 1], [1, 77, 1], [2, 79, 1], [3, 77, 1], [4, 74, 1], [5, 71, 3]],
  b1: [[0, 81, 3], [3, 77, 1], [4, 81, 2], [6, 84, 2]],
  b2: [[0, 84, 1], [1, 81, 1], [2, 78, 2], [4, 75, 2], [6, 72, 2]],
  b3: [[0, 76, 3], [3, 79, 1], [4, 76, 2], [6, 72, 2]],
  b4: [[0, 74, 1], [1, 76, 1], [2, 77, 1], [3, 79, 1], [4, 81, 1], [5, 83, 1], [6, 86, 2]],
};

const A = [['C6', 'a1'], ['A7', 'a2'], ['Dm7', 'a3'], ['G7', 'a4']];
const A2 = [['C6', 'a1'], ['A7', 'a2'], ['Dm7', 'a3'], ['G7', 'a4b']];
const B = [['F6', 'b1'], ['Fdim', 'b2'], ['CG', 'b3'], ['G7', 'b4']];
const FORM = [...A, ...A2, ...B, ...A2];

// Brass stab rhythms: [eighth position, length in eighths]
const STABS = [[3, 1], [6, 1]];
const STABS_TURN = [[0, 2], [3, 1], [5, 1], [7, 1]];

export class LobbyMusic {
  constructor(getCtx, getDest) {
    this.getCtx = getCtx;
    this.getDest = getDest; // where the music plays into (the drunk bus)
    this.playing = false;
    this.bar = 0;
    this.level = 0.45;
  }

  setup() {
    if (this.out) return;
    const c = (this.ctx = this.getCtx());

    this.out = c.createGain();
    this.out.gain.value = 0;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.ratio.value = 3;
    this.out.connect(comp).connect(this.getDest ? this.getDest() : c.destination);

    // Generated "showroom" reverb
    const len = c.sampleRate * 1.8;
    const ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.5);
    }
    this.verb = c.createConvolver();
    this.verb.buffer = ir;
    const wet = c.createGain();
    wet.gain.value = 0.3;
    this.verb.connect(wet).connect(this.out);

    this.dry = c.createGain();
    this.dry.connect(this.out);

    const nb = c.createBuffer(1, c.sampleRate, c.sampleRate);
    const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.noise = nb;
  }

  start() {
    this.setup();
    if (this.playing) return;
    this.playing = true;
    const now = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setValueAtTime(this.out.gain.value, now);
    this.out.gain.linearRampToValueAtTime(this.level, now + 1.5);
    this.bar = 0;
    this.nextBar = now + 0.1;
    this.timer = setInterval(() => this.schedule(), 200);
    this.schedule();
  }

  stop() {
    if (!this.playing) return;
    this.playing = false;
    clearInterval(this.timer);
    const now = this.ctx.currentTime;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setValueAtTime(this.out.gain.value, now);
    this.out.gain.linearRampToValueAtTime(0, now + 0.6);
  }

  /** Temporarily fade the music down (e.g. under the death screen). */
  duck(amount, seconds) {
    if (!this.playing) return;
    const now = this.ctx.currentTime;
    const g = this.out.gain;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(this.level * amount, now + 0.4);
    g.setValueAtTime(this.level * amount, now + seconds);
    g.linearRampToValueAtTime(this.level, now + seconds + 2.5);
  }

  schedule() {
    while (this.nextBar < this.ctx.currentTime + 1.2) {
      this.playBar(this.nextBar);
      this.nextBar += BEAT * 4;
      this.bar++;
    }
  }

  playBar(t0) {
    const i = this.bar % FORM.length;
    const [chordName, phrase] = FORM[i];
    const chord = CHORDS[chordName];
    const next = CHORDS[FORM[(i + 1) % FORM.length][0]];
    const at = (eighth) => t0 + (Math.floor(eighth / 2) + (eighth % 2 ? SWING : 0)) * BEAT;
    const len = (eighths) => eighths * BEAT * 0.5;
    const turnaround = i % 4 === 3;

    // Walking bass
    const r = chord.root;
    const approach = next.root + (i % 2 ? -1 : 1);
    [r, r + chord.walk, r + 7, approach].forEach((m, b) => this.bass(mtof(m), t0 + b * BEAT, BEAT * 0.85));

    // Brass section stabs
    (turnaround ? STABS_TURN : STABS).forEach(([e, l]) => this.brass(chord.voicing, at(e), len(l) * 0.8));

    // Lead melody (muted trumpet)
    PHRASES[phrase].forEach(([e, m, l]) => this.trumpet(mtof(m), at(e), len(l)));

    // Drums: swing ride, hi-hat on 2 & 4, feathered kick, snare comping
    [0, 2, 3, 4, 6, 7].forEach((e) => this.ride(at(e), e % 2 ? 0.05 : 0.09));
    this.hat(at(2));
    this.hat(at(6));
    for (let b = 0; b < 4; b++) this.kick(t0 + b * BEAT, b === 0 ? 0.3 : 0.14);
    if (turnaround) {
      [5, 6, 7].forEach((e, k) => this.snare(at(e), 0.12 + k * 0.05));
    } else if (Math.random() < 0.4) {
      this.snare(at(5), 0.08);
    }

    // Slot-machine sparkle at the top of each chorus and the bridge
    if (i === 0 || i === 8) {
      [84, 88, 91, 96, 100, 103].forEach((m, k) => this.bell(mtof(m), t0 + k * 0.045));
    }
  }

  voice(type, freq, t, dur, vol, { attack = 0.01, cutoff = 2000, verb = true } = {}) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    const f = c.createBiquadFilter();
    o.type = type;
    o.frequency.value = freq;
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g);
    g.connect(this.dry);
    if (verb) g.connect(this.verb);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  trumpet(freq, t, dur) {
    const c = this.ctx;
    const o = c.createOscillator();
    const bp = c.createBiquadFilter();
    const lp = c.createBiquadFilter();
    const g = c.createGain();
    o.type = 'sawtooth';
    o.frequency.value = freq;
    // delayed vibrato on held notes
    if (dur > BEAT) {
      const lfo = c.createOscillator();
      const depth = c.createGain();
      lfo.frequency.value = 5.5;
      depth.gain.setValueAtTime(0, t);
      depth.gain.linearRampToValueAtTime(freq * 0.006, t + dur);
      lfo.connect(depth).connect(o.frequency);
      lfo.start(t);
      lfo.stop(t + dur + 0.1);
    }
    bp.type = 'bandpass';
    bp.frequency.value = 1400;
    bp.Q.value = 1.2;
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(900, t);
    lp.frequency.linearRampToValueAtTime(3200, t + 0.04);
    const end = t + Math.max(dur, 0.12);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.025);
    g.gain.setValueAtTime(0.13, end - 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, end + 0.08);
    o.connect(bp).connect(lp).connect(g);
    g.connect(this.dry);
    g.connect(this.verb);
    o.start(t);
    o.stop(end + 0.1);
  }

  brass(notes, t, dur) {
    const c = this.ctx;
    const lp = c.createBiquadFilter();
    const g = c.createGain();
    lp.type = 'lowpass';
    lp.Q.value = 2;
    lp.frequency.setValueAtTime(500, t);
    lp.frequency.exponentialRampToValueAtTime(2600, t + 0.05);
    lp.frequency.exponentialRampToValueAtTime(900, t + dur + 0.1);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.07, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.15);
    lp.connect(g);
    g.connect(this.dry);
    g.connect(this.verb);
    notes.forEach((m) => {
      for (const detune of [-6, 6]) {
        const o = c.createOscillator();
        o.type = 'sawtooth';
        o.frequency.value = mtof(m - 12);
        o.detune.value = detune;
        o.connect(lp);
        o.start(t);
        o.stop(t + dur + 0.2);
      }
    });
  }

  bass(freq, t, dur) {
    this.voice('triangle', freq, t, dur, 0.26, { attack: 0.008, cutoff: 800, verb: false });
    this.voice('sine', freq * 2, t, dur * 0.3, 0.05, { attack: 0.004, cutoff: 1200, verb: false });
  }

  bell(freq, t) {
    this.voice('sine', freq, t, 0.8, 0.05, { attack: 0.003, cutoff: 9000 });
    this.voice('triangle', freq * 2.01, t, 0.3, 0.015, { attack: 0.002, cutoff: 9000 });
  }

  noiseHit(t, vol, dur, type, freq, q = 0.7) {
    const c = this.ctx;
    const s = c.createBufferSource();
    s.buffer = this.noise;
    const f = c.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.dry);
    s.start(t, Math.random() * 0.5, dur + 0.05);
    return g;
  }

  ride(t, vol) {
    this.noiseHit(t, vol, 0.35, 'bandpass', 7500, 1.5);
    this.voice('square', 5200, t, 0.18, vol * 0.08, { attack: 0.002, cutoff: 12000, verb: false });
  }

  hat(t) {
    this.noiseHit(t, 0.05, 0.05, 'highpass', 8000);
  }

  snare(t, vol) {
    this.noiseHit(t, vol, 0.16, 'bandpass', 1900, 0.8);
    this.voice('sine', 190, t, 0.1, vol * 0.8, { attack: 0.002, cutoff: 1000, verb: false });
  }

  kick(t, vol) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(100, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.connect(g).connect(this.dry);
    o.start(t);
    o.stop(t + 0.27);
  }
}
