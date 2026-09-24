import { RouletteWheel, colorOf, RED } from './wheel.js';
import { celebrate, youDied, winLevel, fxActive, dismissFx } from './fx.js';
import { LobbyMusic } from './music.js';

const rand = (a, b) => a + Math.random() * (b - a);

// ---------- persistence ----------
const store = {
  get(k, d) {
    try {
      const v = localStorage.getItem(k);
      return v == null ? d : JSON.parse(v);
    } catch {
      return d;
    }
  },
  set(k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch {}
  },
};

const START_BALANCE = 1000;
const CHIPS = [1, 5, 25, 100, 500, 1000];

let balance = store.get('fr.balance', START_BALANCE);
let history = store.get('fr.history', []);
let session = 0;
let bets = new Map();      // betKey -> amount
let actions = [];          // undo stack: { key, amount }
let lastBets = null;
let chipValue = 25;
let spinning = false;

const $ = (id) => document.getElementById(id);
const money = (n) =>
  (n < 0 ? '-' : '') + '$' + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
const short = (n) => (n >= 1000 ? (n / 1000).toFixed(n % 1000 ? 1 : 0).replace('.0', '') + 'k' : String(n));

// ---------- sound ----------
const sound = {
  ctx: null,
  muted: store.get('fr.muted', false),
  ensure() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },
  blip(freq, dur, type = 'sine', vol = 0.2, delay = 0) {
    if (this.muted) return;
    const c = this.ensure();
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur);
  },
  tick(v) { this.blip(2200 + Math.random() * 800, 0.025, 'square', 0.03 + 0.05 * v); },
  chip() { this.blip(1100, 0.05, 'triangle', 0.15); this.blip(1600, 0.04, 'triangle', 0.08, 0.02); },
  win(level = 0) {
    // rising arpeggio, then a held major chord; bigger wins go higher and ring longer
    const notes = [523, 659, 784, 1047, 1319, 1568].slice(0, 4 + level);
    notes.forEach((f, i) => this.blip(f, 0.25, 'triangle', 0.16, i * 0.09));
    const end = notes.length * 0.09;
    [523, 659, 784, 1047].forEach((f) => this.blip(f * (level >= 2 ? 2 : 1), 1 + level * 0.4, 'triangle', 0.09, end));
    for (let i = 0; i < 6 + level * 8; i++) this.blip(rand(2200, 3600), 0.12, 'sine', 0.05, end + i * 0.07);
    if (level >= 2) this.boom(0.35);
  },
  // Continuous ball-on-wood roll: filtered noise whose level, pitch and wobble follow the ball speed.
  roll: null,
  noiseBuf() {
    const c = this.ensure();
    if (!this._noise) {
      this._noise = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
      const d = this._noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return this._noise;
  },
  rollUpdate(speed, trackPos) {
    const on = speed > 0 && !this.muted;
    if (!this.roll) {
      if (!on) return;
      const c = this.ensure();
      const src = c.createBufferSource();
      src.buffer = this.noiseBuf();
      src.loop = true;
      // bright "whirr" of the ball on the polished track
      const bp = c.createBiquadFilter();
      bp.type = 'bandpass';
      bp.Q.value = 1.4;
      const whirr = c.createGain();
      whirr.gain.value = 0;
      // low rumble through the wooden bowl
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 160;
      const rumble = c.createGain();
      rumble.gain.value = 0;
      // wobble once per lap, as the ball passes you
      const wob = c.createGain();
      const lfo = c.createOscillator();
      const lfoDepth = c.createGain();
      lfoDepth.gain.value = 0.35;
      lfo.connect(lfoDepth).connect(wob.gain);
      src.connect(bp).connect(whirr).connect(wob);
      src.connect(lp).connect(rumble).connect(wob);
      wob.connect(c.destination);
      src.start();
      lfo.start();
      this.roll = { c, src, lfo, bp, whirr, rumble };
    }
    const { c, bp, whirr, rumble, lfo } = this.roll;
    const t = c.currentTime;
    const s = on ? speed : 0;
    whirr.gain.setTargetAtTime(on ? 0.025 + 0.13 * s * (0.5 + 0.5 * trackPos) : 0, t, 0.06);
    rumble.gain.setTargetAtTime(on ? 0.15 + 0.3 * s : 0, t, 0.08);
    bp.frequency.setTargetAtTime(500 + 2600 * s * (0.6 + 0.4 * trackPos), t, 0.08);
    lfo.frequency.setTargetAtTime(1 + 4 * s, t, 0.1);
    if (!on) {
      const r = this.roll;
      this.roll = null;
      setTimeout(() => { r.src.stop(); r.lfo.stop(); }, 400);
    }
  },
  clack() {
    // wooden "tock" as the ball hits a diamond deflector
    if (this.muted) return;
    const c = this.ensure();
    const t = c.currentTime;
    const src = c.createBufferSource();
    src.buffer = this.noiseBuf();
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1500;
    bp.Q.value = 3;
    const g = c.createGain();
    g.gain.setValueAtTime(0.5, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
    src.connect(bp).connect(g).connect(c.destination);
    src.start(t, Math.random(), 0.1);
    this.blip(820, 0.06, 'sine', 0.2);
    this.blip(1250, 0.05, 'triangle', 0.1, 0.09);
  },
  boom(vol = 0.5, delay = 0) {
    if (this.muted) return;
    const c = this.ensure();
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(30, t + 1.2);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + 1.6);
  },
  died() {
    // deep impact followed by a slow, mournful drone
    if (this.muted) return;
    this.boom(0.7);
    const c = this.ensure();
    const t = c.currentTime + 0.15;
    [[73.4, 'sawtooth', 0.05], [110, 'triangle', 0.08], [87.3, 'sine', 0.1]].forEach(([f, type, vol]) => {
      const o = c.createOscillator();
      const g = c.createGain();
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 600;
      o.type = type;
      o.frequency.setValueAtTime(f, t);
      o.frequency.linearRampToValueAtTime(f * 0.94, t + 3.5);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.9);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 3.8);
      o.connect(lp).connect(g).connect(c.destination);
      o.start(t);
      o.stop(t + 3.9);
    });
  },
  cash() { [880, 1320, 1760].forEach((f, i) => this.blip(f, 0.15, 'sine', 0.15, i * 0.07)); },
  armed() {
    // two-tone alarm as the ALL IN button is armed
    for (let i = 0; i < 4; i++) this.blip(i % 2 ? 660 : 880, 0.14, 'square', 0.07, i * 0.15);
  },
  allIn() {
    // rising whoosh into a big impact
    if (this.muted) return;
    const c = this.ensure();
    const t = c.currentTime;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(1400, t + 0.45);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.4);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + 0.52);
    this.boom(0.8, 0.45);
    [262, 330, 392, 523].forEach((f) => this.blip(f, 0.9, 'sawtooth', 0.04, 0.45));
  },
};

// ---------- bet definitions ----------
const range = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const ALL = range(1, 36);
const BETS = {};
for (let n = 0; n <= 36; n++) BETS['n' + n] = { label: String(n), covers: [n], pays: 35 };
Object.assign(BETS, {
  low:    { label: '1 to 18',  covers: range(1, 18), pays: 1 },
  high:   { label: '19 to 36', covers: range(19, 36), pays: 1 },
  even:   { label: 'EVEN',     covers: ALL.filter((n) => n % 2 === 0), pays: 1 },
  odd:    { label: 'ODD',      covers: ALL.filter((n) => n % 2 === 1), pays: 1 },
  red:    { label: 'RED',      covers: ALL.filter((n) => RED.has(n)), pays: 1 },
  black:  { label: 'BLACK',    covers: ALL.filter((n) => !RED.has(n)), pays: 1 },
  dozen1: { label: '1st 12',   covers: range(1, 12), pays: 2 },
  dozen2: { label: '2nd 12',   covers: range(13, 24), pays: 2 },
  dozen3: { label: '3rd 12',   covers: range(25, 36), pays: 2 },
  col1:   { label: '2 to 1',   covers: ALL.filter((n) => n % 3 === 1), pays: 2 },
  col2:   { label: '2 to 1',   covers: ALL.filter((n) => n % 3 === 2), pays: 2 },
  col3:   { label: '2 to 1',   covers: ALL.filter((n) => n % 3 === 0), pays: 2 },
});
// Inside bets on the lines. Board rows run 3-6-9… (top) to 1-4-7… (bottom),
// so n's upper neighbour is n+1 and its right-hand neighbour is n+3.
const split = (a, b) => (BETS[`s${a}-${b}`] = { label: `Split ${a}/${b}`, covers: [a, b], pays: 17 });
for (let n = 1; n <= 36; n++) {
  if (n <= 33) split(n, n + 3);
  if (n % 3 !== 0) split(n, n + 1);
  if (n % 3 !== 0 && n <= 33) {
    BETS['c' + n] = { label: `Corner ${n}/${n + 1}/${n + 3}/${n + 4}`, covers: [n, n + 1, n + 3, n + 4], pays: 8 };
  }
}
[1, 2, 3].forEach((n) => split(0, n));
// Streets (a column of three) and six-lines (two neighbouring columns), keyed by their lowest number
for (let n = 1; n <= 34; n += 3) {
  BETS['st' + n] = { label: `Street ${n}–${n + 2}`, covers: range(n, n + 2), pays: 11 };
  if (n <= 31) BETS['sl' + n] = { label: `Six line ${n}–${n + 5}`, covers: range(n, n + 5), pays: 5 };
}

// ---------- board ----------
const board = $('board');
const cells = {};

// Each cell gets two grid placements: the wide landscape table (--col/--row) and the
// portrait phone table (--vcol/--vrow), where 0 sits on top and numbers run down in rows of three.
function addCell(key, [col, row], [vcol, vrow], cls = '') {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'cell ' + cls;
  el.dataset.key = key;
  el.style.setProperty('--col', col);
  el.style.setProperty('--row', row);
  el.style.setProperty('--vcol', vcol);
  el.style.setProperty('--vrow', vrow);
  el.innerHTML = `<span class="label">${BETS[key].label}</span><span class="stack"></span>`;
  board.appendChild(el);
  cells[key] = el;
}

addCell('n0', ['1', '1 / 4'], ['3 / 6', '1'], 'num green zero');
for (let n = 1; n <= 36; n++) {
  addCell(
    'n' + n,
    [String(Math.ceil(n / 3) + 1), String(3 - ((n - 1) % 3))],
    [String(3 + ((n - 1) % 3)), String(1 + Math.ceil(n / 3))],
    'num ' + colorOf(n)
  );
}
addCell('col3', ['14', '1'], ['5', '14'], 'outside');
addCell('col2', ['14', '2'], ['4', '14'], 'outside');
addCell('col1', ['14', '3'], ['3', '14'], 'outside');
[1, 2, 3].forEach((k) =>
  addCell('dozen' + k, [`${4 * k - 2} / ${4 * k + 2}`, '4'], ['2', `${4 * k - 2} / span 4`], 'outside side')
);
['low', 'even', 'red', 'black', 'odd', 'high'].forEach((k, i) =>
  addCell(
    k,
    [`${2 + 2 * i} / ${4 + 2 * i}`, '5'],
    ['1', `${2 + 2 * i} / span 2`],
    'outside side ' + (k === 'red' || k === 'black' ? 'swatch ' + k : '')
  )
);
cells.red.querySelector('.label').innerHTML = '<i class="diamond red"></i>';
cells.black.querySelector('.label').innerHTML = '<i class="diamond black"></i>';

// Hotspots sitting on the lines of a number cell (right edge, top edge, top-right corner, left edge)
function addHotspot(key, n, where) {
  const el = document.createElement('span');
  el.className = 'hot ' + where;
  el.dataset.key = key;
  el.innerHTML = '<span class="stack"></span>';
  cells['n' + n].appendChild(el);
  cells[key] = el;
}
for (let n = 1; n <= 36; n++) {
  if (n <= 33) addHotspot(`s${n}-${n + 3}`, n, 'edge-r');
  if (n % 3 !== 0) addHotspot(`s${n}-${n + 1}`, n, 'edge-t');
  if (BETS['c' + n]) addHotspot('c' + n, n, 'corner');
}
[1, 2, 3].forEach((n) => addHotspot(`s0-${n}`, n, 'edge-l'));
// Streets / six-lines sit on the bottom edge of the bottom row (1, 4, 7 …)
for (let n = 1; n <= 34; n += 3) {
  addHotspot('st' + n, n, 'edge-b');
  if (BETS['sl' + n]) addHotspot('sl' + n, n, 'corner-b');
}

const betTarget = (e) => e.target.closest('[data-key]');
board.addEventListener('click', (e) => {
  const t = betTarget(e);
  if (!t) return;
  if (allIn) goAllIn(t.dataset.key);
  else placeBet(t.dataset.key);
});
board.addEventListener('contextmenu', (e) => {
  const t = betTarget(e);
  if (!t) return;
  e.preventDefault();
  removeBet(t.dataset.key);
});
board.addEventListener('mouseover', (e) => {
  const t = betTarget(e);
  board.querySelectorAll('.covered').forEach((c) => c.classList.remove('covered'));
  if (t && BETS[t.dataset.key].covers.length > 1) {
    BETS[t.dataset.key].covers.forEach((n) => cells['n' + n].classList.add('covered'));
  }
});
board.addEventListener('mouseleave', () =>
  board.querySelectorAll('.covered').forEach((c) => c.classList.remove('covered'))
);

// ---------- chips: rack, spot stacks, flying chips ----------
// What is *drawn* can lag the real state while chips are in the air; once nothing
// is flying, render() snaps the drawing back to the real balance and bets.
const shown = { bank: balance, spots: new Map() };
let inflight = 0;

const DESC = [...CHIPS].reverse();
function breakdown(amount) {
  const out = [];
  let a = Math.floor(amount);
  for (const c of DESC) while (a >= c) { out.push(c); a -= c; }
  return out;
}
function countsOf(amount) {
  const m = {};
  let a = Math.floor(Math.max(0, amount));
  for (const c of DESC) { m[c] = Math.floor(a / c); a -= m[c] * c; }
  return m;
}
// Split an amount into at most `max` flying chips (the last one carries any remainder)
function pieces(amount, max = 6) {
  const b = breakdown(amount);
  if (b.length <= max) return b.map((v) => ({ value: v, denom: v }));
  const head = b.slice(0, max - 1).map((v) => ({ value: v, denom: v }));
  head.push({ value: b.slice(max - 1).reduce((s, v) => s + v, 0), denom: b[max - 1] });
  return head;
}

// Rack: one column per denomination, doubling as the chip picker
const rackCols = {};
const RACK_VISIBLE = 14;
CHIPS.forEach((v) => {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'rack-col';
  b.dataset.value = v;
  b.innerHTML = `<span class="rack-stack"></span><span class="rack-count"></span>`;
  b.addEventListener('click', () => {
    chipValue = v;
    renderRack();
  });
  $('rackCols').appendChild(b);
  rackCols[v] = b;
});

function renderRack() {
  const counts = countsOf(shown.bank);
  CHIPS.forEach((v) => {
    const col = rackCols[v];
    const vis = Math.min(counts[v], RACK_VISIBLE);
    const stack = col.querySelector('.rack-stack');
    if (stack.childElementCount !== vis) {
      stack.innerHTML = Array.from({ length: vis }, (_, i) => `<i class="pchip c${v}" style="--i:${i}"></i>`).join('');
    }
    col.querySelector('.rack-count').innerHTML = `<b>${short(v)}</b>×${counts[v]}`;
    col.classList.toggle('active', v === chipValue);
    col.classList.toggle('empty', v > balance);
    col.title = `${money(v)} chips: ${counts[v]}`;
  });
  $('rackTotal').textContent = money(shown.bank);
}

function renderSpot(key) {
  const amt = shown.spots.get(key) || 0;
  const stack = cells[key].querySelector('.stack');
  if (amt <= 0) {
    stack.innerHTML = '';
    return;
  }
  const chips = breakdown(amt).slice(0, 7).reverse(); // biggest chip on top
  stack.innerHTML =
    chips.map((c, i) => `<i class="schip c${c}" style="--i:${i}"></i>`).join('') +
    `<span class="stack-label" style="--n:${chips.length - 1}">${short(amt)}</span>`;
}
function addSpot(key, v) {
  shown.spots.set(key, (shown.spots.get(key) || 0) + v);
  renderSpot(key);
}
function addBank(v) {
  shown.bank += v;
  renderRack();
}

const centerOf = (el) => {
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
};
const rackPoint = (v) => () => {
  const r = rackCols[v].querySelector('.rack-stack').getBoundingClientRect();
  const n = Math.min(countsOf(shown.bank)[v], RACK_VISIBLE);
  return { x: r.left + r.width / 2, y: r.bottom - 12 - n * 5 };
};
const dealerPoint = () => {
  const r = $('wheel').getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height * 0.5 };
};
const resolvePoint = (p) => (p instanceof Element ? centerOf(p) : typeof p === 'function' ? p() : p);

/** Throw one chip along an arc from `from` to `to` (elements, points or point getters). */
function fly(from, to, denom, { delay = 0, onStart, onLand, fade = false } = {}) {
  inflight++;
  setTimeout(() => {
    onStart?.();
    const a = resolvePoint(from);
    const b = resolvePoint(to);
    const el = document.createElement('i');
    el.className = `fly-chip c${denom}`;
    document.body.appendChild(el);
    const dist = Math.hypot(b.x - a.x, b.y - a.y);
    const mid = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - Math.min(170, 50 + dist * 0.25) };
    const spin = (Math.random() < 0.5 ? -1 : 1) * 360;
    const frames = [];
    for (let k = 0; k <= 10; k++) {
      const t = k / 10;
      const x = (1 - t) ** 2 * a.x + 2 * (1 - t) * t * mid.x + t * t * b.x;
      const y = (1 - t) ** 2 * a.y + 2 * (1 - t) * t * mid.y + t * t * b.y;
      const s = 1 + 0.35 * Math.sin(Math.PI * t);
      frames.push({
        transform: `translate(${x - 17}px, ${y - 17}px) scale(${s}) rotate(${spin * t}deg)`,
        opacity: fade && t > 0.6 ? 1 - (t - 0.6) / 0.4 : 1,
      });
    }
    const dur = 380 + Math.min(260, dist * 0.25);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.remove();
      onLand?.();
      if (--inflight === 0) render();
    };
    el.animate(frames, { duration: dur, easing: 'cubic-bezier(0.4, 0, 0.3, 1)' }).onfinish = finish;
    setTimeout(finish, dur + 400); // in case animations are throttled (background tab)
  }, delay);
}

/** Chips leave the rack and land on a betting spot. */
function throwToSpot(key, amount, delay = 0, maxChips = 6) {
  addBank(-amount);
  pieces(amount, maxChips).forEach((p, i) =>
    fly(rackPoint(p.denom)(), cells[key], p.denom, {
      delay: delay + i * 70,
      onLand: () => {
        addSpot(key, p.value);
        sound.chip();
      },
    })
  );
}
/** Chips on a spot go back to the rack. */
function returnToRack(key, amount, delay = 0) {
  pieces(amount).forEach((p, i) =>
    fly(cells[key], rackPoint(p.denom), p.denom, {
      delay: delay + i * 60,
      onStart: () => addSpot(key, -p.value),
      onLand: () => {
        addBank(p.value);
        sound.chip();
      },
    })
  );
}

// ---------- betting actions ----------
const totalBets = () => [...bets.values()].reduce((a, b) => a + b, 0);

function clearHighlights() {
  board.querySelectorAll('.winner, .won, .lost').forEach((c) => c.classList.remove('winner', 'won', 'lost'));
}

function placeBet(key, amount = chipValue, record = true, delay = 0, maxChips = 6) {
  if (spinning) return false;
  if (balance < amount) {
    toast('Not enough balance — add some fake funds');
    $('addFundsBtn').classList.add('pulse');
    return false;
  }
  clearHighlights();
  balance -= amount;
  bets.set(key, (bets.get(key) || 0) + amount);
  if (record) actions.push({ key, amount });
  throwToSpot(key, amount, delay, maxChips);
  render();
  return true;
}

function removeBet(key) {
  if (spinning || !bets.has(key)) return;
  const amt = bets.get(key);
  balance += amt;
  bets.delete(key);
  actions = actions.filter((a) => a.key !== key);
  returnToRack(key, amt);
  render();
}

$('undoBtn').addEventListener('click', () => {
  if (spinning || !actions.length) return;
  const { key, amount } = actions.pop();
  const left = bets.get(key) - amount;
  left > 0 ? bets.set(key, left) : bets.delete(key);
  balance += amount;
  returnToRack(key, amount);
  render();
});

$('clearBtn').addEventListener('click', () => {
  if (spinning) return;
  [...bets.entries()].forEach(([key, amt], i) => returnToRack(key, amt, i * 50));
  balance += totalBets();
  bets.clear();
  actions = [];
  render();
});

$('rebetBtn').addEventListener('click', () => {
  if (spinning || !lastBets) return;
  const need = [...lastBets.values()].reduce((a, b) => a + b, 0);
  if (need > balance) return toast(`Rebet needs ${money(need)} — you have ${money(balance)}`);
  [...lastBets.entries()].forEach(([key, amt], i) => placeBet(key, amt, true, i * 90));
});

// ---------- ALL IN ----------
let allIn = false;
function setAllIn(on) {
  allIn = on;
  const b = $('allInBtn');
  b.classList.toggle('armed', on);
  b.setAttribute('aria-pressed', String(on));
  board.classList.toggle('allin-armed', on);
  b.disabled = !on && (spinning || balance < 1);
}
$('allInBtn').addEventListener('click', () => {
  if (spinning) return;
  if (allIn) return setAllIn(false);
  if (balance < 1) return toast('Nothing left to go all in with — add some fake funds');
  setAllIn(true);
  sound.armed();
  toast(`ALL IN armed — your next spot gets all ${money(balance)}`);
});
function goAllIn(key) {
  const amount = balance;
  setAllIn(false);
  if (amount < 1) return;
  placeBet(key, amount, true, 0, 12);
  sound.allIn();
  document.querySelectorAll('header, main').forEach((el) => {
    el.classList.remove('shake-2');
    void el.offsetWidth;
    el.classList.add('shake-2');
    setTimeout(() => el.classList.remove('shake-2'), 1000);
  });
  toast(`ALL IN! ${money(amount)} on ${BETS[key].label}`);
}

$('doubleBtn').addEventListener('click', () => {
  if (spinning || !bets.size) return;
  const need = totalBets();
  if (need > balance) return toast(`Doubling needs another ${money(need)}`);
  [...bets.entries()].forEach(([key, amt], i) => placeBet(key, amt, true, i * 90));
});

// ---------- spin ----------
const wheel = new RouletteWheel($('wheel'), {
  onTick: (v) => sound.tick(v),
  onRoll: (speed, trackPos) => sound.rollUpdate(speed, trackPos),
  onClack: () => sound.clack(),
});
// Frames stop while the tab is hidden, so don't leave the roll droning
document.addEventListener('visibilitychange', () => document.hidden && sound.rollUpdate(0, 0));

function randomNumber() {
  // unbiased 0..36 using the crypto RNG
  const buf = new Uint32Array(1);
  const limit = Math.floor(0xffffffff / 37) * 37;
  do crypto.getRandomValues(buf);
  while (buf[0] >= limit);
  return buf[0] % 37;
}

$('spinBtn').addEventListener('click', spin);
document.addEventListener('keydown', (e) => {
  if (e.code === 'Escape' && allIn) return setAllIn(false);
  if ((e.code === 'Space' || e.code === 'Escape') && fxActive()) {
    e.preventDefault();
    return dismissFx();
  }
  if (e.code === 'Space' && !$('fundsModal').open && !$('roadmapModal').open && document.activeElement.tagName !== 'INPUT') {
    e.preventDefault();
    spin();
  }
});

async function spin() {
  if (spinning) return;
  if (!bets.size) return toast('Place a bet first');
  sound.ensure();
  setAllIn(false);
  spinning = true;
  lastBets = new Map(bets);
  hideResult();
  render();
  // On phones the table sits below the wheel, so bring the wheel into view for the spin
  if (matchMedia('(max-width: 700px)').matches) {
    document.querySelector('.stage').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  const result = await wheel.spin(randomNumber());
  settle(result);
}

function settle(n) {
  const staked = totalBets();
  let returned = 0;
  [...bets.entries()].forEach(([key, amt], k) => {
    const win = BETS[key].covers.includes(n);
    cells[key].classList.add(win ? 'won' : 'lost');
    if (win) {
      // dealer pays out onto the spot, then the whole stack comes home to the rack
      const payout = amt * BETS[key].pays;
      returned += amt + payout;
      pieces(payout, 5).forEach((p, i) =>
        fly(dealerPoint, cells[key], p.denom, {
          delay: 300 + k * 90 + i * 80,
          onLand: () => { addSpot(key, p.value); sound.chip(); },
        })
      );
      pieces(amt + payout, 8).forEach((p, i) =>
        fly(cells[key], rackPoint(p.denom), p.denom, {
          delay: 1500 + k * 90 + i * 70,
          onStart: () => addSpot(key, -p.value),
          onLand: () => { addBank(p.value); sound.chip(); },
        })
      );
    } else {
      // losing chips are swept off to the wheel
      pieces(amt, 5).forEach((p, i) =>
        fly(cells[key], dealerPoint, p.denom, {
          delay: 600 + k * 60 + i * 60,
          onStart: () => addSpot(key, -p.value),
          fade: true,
        })
      );
    }
  });
  bets.clear();
  actions = [];
  cells['n' + n].classList.add('winner');
  const net = returned - staked;
  balance += returned;
  session += net;

  history.unshift(n);
  history = history.slice(0, 18);
  store.set('fr.history', history);

  showResult(n, net, returned);
  if (net > 0) {
    const level = winLevel(net, staked);
    const r = cells['n' + n].getBoundingClientRect();
    celebrate({ net, level, origin: { x: innerWidth / 2, y: Math.min(r.top, innerHeight * 0.4) } });
    wheel.flash(level);
    sound.win(level);
    music.duck(0.35, 2 + level);
  } else if (net < 0) {
    setTimeout(() => {
      youDied({ lost: -net, broke: balance < 1 });
      sound.died();
      music.duck(0, 4);
    }, 350);
  }

  setTimeout(() => {
    spinning = false;
    render();
    if (balance < 1) {
      toast('Out of chips! Top up with a fake card');
      $('addFundsBtn').classList.add('pulse');
    }
  }, 1800);
  render();
}

function showResult(n, net, returned) {
  const el = $('result');
  const c = colorOf(n);
  const text =
    net > 0 ? `<span>You win <b>${money(net)}</b></span>` :
    net < 0 ? (returned ? `<span>Back ${money(returned)} · net <b>${money(net)}</b></span>` : `<span>You lose <b>${money(-net)}</b></span>`) :
    '<span>Push — you broke even</span>';
  el.className = 'result show ' + (net > 0 ? 'win' : net < 0 ? 'lose' : '');
  el.innerHTML = `<div class="ball-num ${c}">${n}</div>
    <div class="result-text"><small>${c.toUpperCase()}${n ? ' · ' + (n % 2 ? 'ODD' : 'EVEN') : ''}</small>${text}</div>`;
}
function hideResult() {
  $('result').className = 'result';
}

// ---------- render ----------
function render() {
  $('balance').textContent = money(balance);
  $('onTable').textContent = money(totalBets());
  const s = $('session');
  s.textContent = (session > 0 ? '+' : '') + money(session);
  s.className = session > 0 ? 'pos' : session < 0 ? 'neg' : '';

  if (!inflight) {
    shown.bank = balance;
    shown.spots = new Map(bets);
  }
  for (const key in cells) {
    const amt = bets.get(key);
    renderSpot(key);
    cells[key].title = amt
      ? `${BETS[key].label}: ${money(amt)} (pays ${BETS[key].pays}:1)`
      : `${BETS[key].label} — pays ${BETS[key].pays}:1`;
  }

  $('history').innerHTML = history
    .map((n, i) => `<span class="h ${colorOf(n)}${i === 0 ? ' latest' : ''}">${n}</span>`)
    .join('');

  $('spinBtn').disabled = spinning || !bets.size;
  $('spinBtn').textContent = spinning ? 'No more bets…' : 'SPIN';
  $('undoBtn').disabled = spinning || !actions.length;
  $('clearBtn').disabled = spinning || !bets.size;
  $('rebetBtn').disabled = spinning || !lastBets;
  $('doubleBtn').disabled = spinning || !bets.size;
  board.classList.toggle('locked', spinning);
  $('allInBtn').disabled = !allIn && (spinning || balance < 1);
  renderRack();

  // Stakes still on the felt count as yours until the wheel is spun
  store.set('fr.balance', spinning ? balance : balance + totalBets());
}

// ---------- toast ----------
let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}

// ---------- mute ----------
function renderMute() {
  $('muteBtn').textContent = sound.muted ? '🔇' : '🔊';
}
$('muteBtn').addEventListener('click', () => {
  sound.muted = !sound.muted;
  store.set('fr.muted', sound.muted);
  renderMute();
});
renderMute();

// ---------- lobby music ----------
const music = new LobbyMusic(() => sound.ensure());
let musicOn = store.get('fr.music', true);
function renderMusic() {
  const b = $('musicBtn');
  b.classList.toggle('off', !musicOn);
  b.title = musicOn ? 'Lobby music: on' : 'Lobby music: off';
}
$('musicBtn').addEventListener('click', () => {
  musicOn = !musicOn;
  store.set('fr.music', musicOn);
  musicOn ? music.start() : music.stop();
  renderMusic();
});
renderMusic();
// Browsers only allow audio after a user gesture, so start on the first one.
const kickoff = () => {
  if (musicOn) music.start();
  removeEventListener('pointerdown', kickoff);
  removeEventListener('keydown', kickoff);
};
addEventListener('pointerdown', kickoff);
addEventListener('keydown', kickoff);

// ---------- roadmap (Coming Soon™) ----------
// Keep in sync with the "COMING SOON™" section of README.md
const HEADLINERS = [
  { id: 'multiplayer', icon: '👯', title: 'MULTIPLAYER', desc: 'Lose fake money together, in real time, with your friends.', tag: 'perchance', pct: 35 },
  { id: 'slots', icon: '🎰', title: 'SLOTS', desc: 'Those machines in the background are getting jealous.', tag: 'most likely', pct: 80 },
  { id: 'funny', icon: '🤡', title: 'OTHER FUNNY STUFF', desc: "You'll know it when you see it.", tag: 'guaranteed', pct: 100 },
];
const MAYBES = [
  ['🃏', 'Blackjack table in the corner, dealt by a suspiciously smug dealer', 'maybe'],
  ['🏆', 'Leaderboard of Shame, ranked by the biggest fake loss in one spin', 'someday'],
  ['🐔', 'Chicken mode: the ball is a tiny rubber chicken. Pays the same. Sounds worse.', 'please'],
  ['🍸', 'Free drinks: a waiter walks past every 30 seconds and never stops at your table', 'in beta (no)'],
  ['🎲', 'Craps, purely so we can say "craps" in the game', 'lol'],
  ['🧓', 'Your grandma, who tells you to stop after 3 losses in a row', 'she insists'],
  ['🎟️', 'Loyalty card: earn points for every fake dollar lost, redeem for nothing', 'unlikely'],
  ['📉', 'Fake stock ticker of your net worth, with dramatic crash sounds', 'maybe'],
  ['🌙', 'Night mode, even though casinos famously have no clocks or windows', 'ironic'],
  ['🔁', 'Martingale button: doubles your bet after every loss until the heat death of the universe', 'dangerous'],
  ['🎤', 'Hype announcer who screams "HE\'S ON FIRE" after two wins in a row', 'if bored'],
  ['🎁', 'Daily login bonus of $1, delivered via a 45-second unskippable animation', 'evil'],
  ['🐋', 'Whale mode: 10× bigger chips and a velvet rope around the table', 'someday'],
  ['🛸', 'Alien abduction: a UFO beams your chips away (it\'s in the T&Cs)', 'classified'],
  ['🎮', 'Controller support, because roulette on a gamepad is how nature intended', 'maybe'],
  ['🥚', 'Easter eggs we will absolutely forget where we hid', 'already lost'],
];
const hype = store.get('fr.hype', {});
const hypeBtn = (id) =>
  `<button type="button" class="rm-hype" data-hype="${id}" title="Hype it (changes nothing, feels great)">🔥 <b>${hype[id] || 0}</b></button>`;

$('rmHeadliners').innerHTML = HEADLINERS.map(
  (h) => `<div class="rm-card">
    <div class="rm-icon">${h.icon}</div>
    <div class="rm-title">${h.title}</div>
    <div class="rm-desc">${h.desc}</div>
    <div class="rm-meter" title="${h.pct}% likely (source: vibes)"><i style="width:${h.pct}%"></i></div>
    <div class="rm-row"><span class="rm-tag t-${h.pct}">${h.tag}</span>${hypeBtn(h.id)}</div>
  </div>`
).join('');
$('rmList').innerHTML = MAYBES.map(
  ([icon, text, tag], i) =>
    `<li><span class="rm-li-icon">${icon}</span><span class="rm-li-text">${text}</span><span class="rm-tag">${tag}</span>${hypeBtn('m' + i)}</li>`
).join('');

document.querySelector('.roadmap').addEventListener('click', (e) => {
  const b = e.target.closest('.rm-hype');
  if (!b) return;
  const id = b.dataset.hype;
  hype[id] = (hype[id] || 0) + 1;
  store.set('fr.hype', hype);
  b.querySelector('b').textContent = hype[id];
  b.classList.remove('bump');
  void b.offsetWidth;
  b.classList.add('bump');
  sound.chip();
});
$('roadmapBtn').addEventListener('click', () => $('roadmapModal').showModal());
$('closeRoadmap').addEventListener('click', () => $('roadmapModal').close());
$('roadmapModal').addEventListener('click', (e) => {
  if (e.target === e.currentTarget) e.currentTarget.close();
});

// ---------- fake funds ----------
const modal = $('fundsModal');
const form = $('fundsForm');
const f = {
  number: $('ccNumber'),
  name: $('ccName'),
  exp: $('ccExp'),
  cvc: $('ccCvc'),
  custom: $('ccCustom'),
};
let depositAmount = 500;

$('addFundsBtn').addEventListener('click', () => {
  $('addFundsBtn').classList.remove('pulse');
  resetForm();
  modal.showModal();
  f.number.focus();
});
$('closeModal').addEventListener('click', () => modal.close());
modal.addEventListener('click', (e) => {
  if (e.target === modal) modal.close();
});

const digits = (s) => s.replace(/\D/g, '');

function brandOf(num) {
  if (/^4/.test(num)) return 'visa';
  if (/^(5[1-5]|2[2-7])/.test(num)) return 'mastercard';
  if (/^3[47]/.test(num)) return 'amex';
  if (/^6/.test(num)) return 'discover';
  return '';
}

function luhn(num) {
  let sum = 0;
  for (let i = 0; i < num.length; i++) {
    let d = +num[num.length - 1 - i];
    if (i % 2) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return num.length >= 13 && sum % 10 === 0;
}

f.number.addEventListener('input', () => {
  const d = digits(f.number.value).slice(0, 19);
  f.number.value = d.replace(/(.{4})/g, '$1 ').trim();
  updatePreview();
});
f.exp.addEventListener('input', () => {
  let d = digits(f.exp.value).slice(0, 4);
  if (d.length === 1 && +d > 1) d = '0' + d;
  f.exp.value = d.length > 2 ? d.slice(0, 2) + '/' + d.slice(2) : d;
  updatePreview();
});
f.cvc.addEventListener('input', () => {
  f.cvc.value = digits(f.cvc.value).slice(0, 4);
});
f.name.addEventListener('input', updatePreview);

document.querySelectorAll('.amount-opt').forEach((b) =>
  b.addEventListener('click', () => {
    depositAmount = +b.dataset.amount;
    f.custom.value = '';
    updateAmount();
  })
);
f.custom.addEventListener('input', () => {
  f.custom.value = digits(f.custom.value).slice(0, 6);
  depositAmount = +f.custom.value || 0;
  updateAmount();
});

function updateAmount() {
  document.querySelectorAll('.amount-opt').forEach((b) =>
    b.classList.toggle('active', !f.custom.value && +b.dataset.amount === depositAmount)
  );
  $('payBtn').textContent = depositAmount ? `Deposit ${money(depositAmount)}` : 'Deposit';
}

function updatePreview() {
  const d = digits(f.number.value);
  const masked = (d + '•'.repeat(Math.max(0, 16 - d.length))).replace(/(.{4})/g, '$1 ').trim();
  $('cpNumber').textContent = masked;
  $('cpName').textContent = f.name.value.trim().toUpperCase() || 'YOUR NAME';
  $('cpExp').textContent = f.exp.value || 'MM/YY';
  const brand = brandOf(d);
  $('cardPreview').dataset.brand = brand;
  $('cpBrand').textContent = brand ? brand.toUpperCase() : 'FAKECARD';
}

$('fillTest').addEventListener('click', () => {
  f.number.value = '4242 4242 4242 4242';
  f.name.value = 'Lucky Player';
  const y = (new Date().getFullYear() + 3) % 100;
  f.exp.value = `12/${String(y).padStart(2, '0')}`;
  f.cvc.value = '123';
  updatePreview();
  $('formError').textContent = '';
});

function resetForm() {
  form.reset();
  form.hidden = false;
  $('processing').hidden = true;
  $('success').hidden = true;
  $('formError').textContent = '';
  form.querySelectorAll('.invalid').forEach((el) => el.classList.remove('invalid'));
  depositAmount = 500;
  updateAmount();
  updatePreview();
}

function validate() {
  const errs = [];
  const mark = (el, bad, msg) => {
    el.classList.toggle('invalid', bad);
    if (bad) errs.push(msg);
  };
  const num = digits(f.number.value);
  mark(f.number, !luhn(num), 'Card number is invalid (try 4242 4242 4242 4242)');
  mark(f.name, !f.name.value.trim(), 'Enter a name');
  const [mm, yy] = f.exp.value.split('/').map(Number);
  const now = new Date();
  const expired =
    !mm || mm > 12 || yy == null || isNaN(yy) ||
    2000 + yy < now.getFullYear() || (2000 + yy === now.getFullYear() && mm < now.getMonth() + 1);
  mark(f.exp, expired, 'Expiry date is invalid or in the past');
  mark(f.cvc, !/^\d{3,4}$/.test(f.cvc.value), 'CVC must be 3–4 digits');
  mark(f.custom, depositAmount < 1 || depositAmount > 100000, 'Amount must be between $1 and $100,000');
  return errs;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const errs = validate();
  $('formError').textContent = errs[0] || '';
  if (errs.length) return;

  // Stripe-style "decline" test card, for fun
  const declined = digits(f.number.value) === '4000000000000002';
  const amount = depositAmount;
  // Card details are never stored or sent — wipe them right away.
  form.reset();
  updatePreview();
  form.hidden = true;
  $('processing').hidden = false;

  setTimeout(() => {
    $('processing').hidden = true;
    if (declined) {
      form.hidden = false;
      updateAmount();
      $('formError').textContent = 'Card declined (that’s the decline test card 😉)';
      return;
    }
    balance += amount;
    // once the dialog closes, the cashier's chips fly into your rack
    pieces(amount, 10).forEach((p, i) =>
      fly($('addFundsBtn'), rackPoint(p.denom), p.denom, {
        delay: 1550 + i * 90,
        onLand: () => { addBank(p.value); sound.chip(); },
      })
    );
    render();
    sound.cash();
    $('successAmount').textContent = money(amount);
    $('success').hidden = false;
    setTimeout(() => modal.open && modal.close(), 1400);
    toast(`+${money(amount)} fake dollars added`);
  }, 1300);
});

$('resetBalance').addEventListener('click', () => {
  if (spinning) return;
  if (!confirm(`Reset balance to ${money(START_BALANCE)} and clear history?`)) return;
  bets.clear();
  actions = [];
  lastBets = null;
  balance = START_BALANCE;
  session = 0;
  history = [];
  store.set('fr.history', history);
  clearHighlights();
  hideResult();
  render();
  modal.close();
});

render();
