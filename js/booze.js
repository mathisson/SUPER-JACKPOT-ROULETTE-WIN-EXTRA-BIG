// 🍸 The drink stack: free drinks from the waiter, a tipsy-meter, and consequences.

export const DRINKS = [
  { emoji: '🍸', name: 'Martini', abv: 1.5 },
  { emoji: '🍹', name: 'Tiki Punch', abv: 1.5 },
  { emoji: '🥂', name: 'Champagne', abv: 1 },
  { emoji: '🍺', name: 'Beer', abv: 1 },
  { emoji: '🍷', name: 'Red Wine', abv: 1 },
  { emoji: '🥃', name: 'Whiskey', abv: 2 },
  { emoji: '🧪', name: 'Mystery Blue Thing', abv: 3 },
];

// BAC thresholds → effect level 0..4
const LEVELS = [
  { at: 0, name: 'Sober', face: '😐', fx: 0, msg: '' },
  { at: 1, name: 'Tipsy', face: '🙂', fx: 1, msg: 'You feel lucky 🍀' },
  { at: 3, name: 'Buzzed', face: '😵‍💫', fx: 2, msg: 'Everything is blurry, but in a fun way' },
  { at: 5, name: 'Drunk', face: '🥴', fx: 3, msg: 'The numbers are dancing 💃' },
  { at: 7, name: 'Wasted', face: '🤪', fx: 4, msg: 'You ARE the house now' },
  { at: 9, name: 'LEGENDARY', face: '🦄', fx: 4, msg: 'Legendary. Nobody has ever seen this.' },
];
const BLACKOUT_AT = 10;
const SOBER_EVERY = 30_000; // one unit wears off every 30 s
const WATER_COST = 5;
const CAB_FARE = 20;

const levelOf = (bac) => [...LEVELS].reverse().find((l) => bac >= l.at);
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

export function createBar({ stage, store, sound, toast, getBalance, spend }) {
  // persisted, with the sobering-up that happened while you were away
  const saved = store.get('fr.booze', { bac: 0, drinks: [], t: Date.now() });
  let bac = Math.max(0, saved.bac - Math.floor((Date.now() - saved.t) / SOBER_EVERY));
  let drinks = bac > 0 ? saved.drinks.slice(-Math.ceil(bac)) : [];
  let current = levelOf(bac);
  let blackedOut = false;

  const hud = document.createElement('div');
  hud.className = 'bar-hud';
  hud.innerHTML = `
    <div class="bar-glasses"></div>
    <div class="bar-info"><b class="bar-count"></b><span class="bar-level"></span></div>
    <div class="bar-meter" title="Tipsy-meter™"><i></i><span class="bar-needle"></span></div>
    <button type="button" class="bar-water" title="Drinks are free. Water is not.">💧 Water $${WATER_COST}</button>`;
  stage.appendChild(hud);
  const glassesEl = hud.querySelector('.bar-glasses');

  const save = () => store.set('fr.booze', { bac, drinks, t: Date.now() });

  function renderGlasses(newest = false) {
    // pyramid: 4 on the bottom row, then 3, 2, 1
    const shown = drinks.slice(-10);
    const slots = [];
    for (let row = 0; row < 4; row++) for (let i = 0; i < 4 - row; i++) slots.push([row, i]);
    glassesEl.innerHTML = shown
      .map((d, i) => {
        const [row, col] = slots[i];
        const x = col * 26 + row * 13;
        const y = row * 24;
        const tilt = ((i * 37) % 21) - 10;
        const cls = newest && i === shown.length - 1 ? ' drop' : '';
        return `<span class="glass${cls}" style="left:${x}px;bottom:${y}px;--tilt:${tilt}deg">${d}</span>`;
      })
      .join('');
    if (drinks.length > 10) glassesEl.insertAdjacentHTML('beforeend', `<span class="glass-more">+${drinks.length - 10}</span>`);
  }

  function render(newest) {
    current = levelOf(bac);
    hud.querySelector('.bar-count').textContent = `${drinks.length ? drinks[drinks.length - 1] : '🍸'} × ${drinks.length}`;
    hud.querySelector('.bar-level').textContent = `${current.name} ${current.face}`;
    const pct = Math.min(100, (bac / BLACKOUT_AT) * 100);
    hud.querySelector('.bar-meter i').style.width = pct + '%';
    hud.querySelector('.bar-needle').style.left = pct + '%';
    hud.classList.toggle('empty', !drinks.length);
    for (let i = 0; i <= 4; i++) document.body.classList.toggle('drunk-' + i, current.fx === i && i > 0);
    document.body.style.setProperty('--drunk', current.fx);
    sound.setDrunk?.(current.fx); // music + effects go woozy too
    renderGlasses(newest);
  }

  function setBac(v, announce = true) {
    const before = levelOf(bac);
    bac = Math.max(0, v);
    if (bac === 0) drinks = [];
    const after = levelOf(bac);
    save();
    render();
    if (announce && after.fx > before.fx && after.msg) toast(`${after.face} ${after.name}! ${after.msg}`);
    if (bac >= BLACKOUT_AT) blackout();
  }

  /** A drink arrives (already flown in by the waiter). */
  function add(drink) {
    if (blackedOut) return;
    drinks.push(drink.emoji);
    sound.clink();
    const before = levelOf(bac);
    bac += drink.abv;
    save();
    render(true);
    const after = levelOf(bac);
    if (after.fx > before.fx && after.msg) toast(`${after.face} ${after.name}! ${after.msg}`);
    else toast(`${drink.emoji} ${drink.name}! Cheers!`);
    if (bac >= BLACKOUT_AT) setTimeout(blackout, 900);
  }

  function blackout() {
    if (blackedOut) return;
    blackedOut = true;
    const el = document.createElement('div');
    el.className = 'blackout';
    el.innerHTML = `
      <div class="bo-zzz">💤</div>
      <div class="bo-text">
        <h2>You wake up in the parking lot.</h2>
        <p>Cab fare home: <b>-$${CAB_FARE}</b></p>
        <small>The waiter says hi. He still didn't bring water.</small>
      </div>`;
    document.body.appendChild(el);
    sound.boom(0.6);
    setTimeout(() => {
      spend(Math.min(CAB_FARE, getBalance()));
      bac = 0;
      drinks = [];
      save();
      render();
    }, 2500);
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 800);
      blackedOut = false;
    }, 6000);
  }

  hud.querySelector('.bar-water').addEventListener('click', () => {
    if (!bac) return toast('You are perfectly sober. Suspiciously sober.');
    if (getBalance() < WATER_COST) return toast(`Water costs $${WATER_COST}. Drinks are free. Welcome to Vegas.`);
    spend(WATER_COST);
    sound.blip(520, 0.2, 'sine', 0.12);
    sound.blip(390, 0.25, 'sine', 0.1, 0.1);
    toast(`💧 Hydration! (-$${WATER_COST}). Your liver thanks you.`);
    setBac(bac - 2, false);
  });

  setInterval(() => bac > 0 && !blackedOut && setBac(Math.max(0, bac - 1), false), SOBER_EVERY);
  render();

  return {
    add,
    level: () => current.fx,
    target: () => {
      const r = glassesEl.getBoundingClientRect();
      return { x: r.left + 50, y: r.bottom - 20 - Math.min(3, Math.floor(drinks.length / 4)) * 24 };
    },
    /** How likely a drunk hand misses its spot. */
    missChance: () => [0, 0, 0.2, 0.33, 0.5][current.fx],
    blackedOut: () => blackedOut,
    pickDrink: () => pick(DRINKS),
  };
}
