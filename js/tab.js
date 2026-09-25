// 🧾 THE BAR TAB: drinks from the menu go on your tab. When it gets too big the waiter
// brings a very long receipt. Can't pay? There's a sink in the back with your name on it.

import { emit } from './events.js';
import { ReceiptScene, DishScene } from './kitchen3d.js';

const TAB_LIMIT = 100; // the waiter shows up once the tab (fees and all) hits this
const PLATE_PAY = 20;
const GROSS_PAY = 5;
const SHIFT = 30; // seconds of dishwashing
const BAN_MS = 90_000;
const MAX_TIP = 25;

const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

const CHEF_LINES = [
  'FASTER!', 'Scrub like you bet: ALL IN!', 'Is that LIPSTICK?!', 'Who eats shrimp at a casino?',
  'You call that clean?', 'Put your back into it!', 'Those plates won\'t wash themselves. Well. They might.',
  'The waiter is watching. He is always watching.', 'My grandmother scrubs faster and she\'s a ghost',
];

/**
 * @param isBusy   () => bool, something else is on screen, so the waiter waits
 * @param pause3d / resume3d  only one 3D room renders at a time
 * @param earn     (v) => void, the chef's tip
 */
export function createTab({ store, sound, music, toast, booze, getBalance, spend, earn, pause3d, resume3d, isBusy }) {
  let state = store.get('fr.tab', { items: [], banUntil: 0 });
  const save = () => store.set('fr.tab', state);
  let open = false;
  let settleTimer = null;

  // ---------- the little receipt chip on the drink stack ----------
  const chip = document.createElement('button');
  chip.type = 'button';
  chip.className = 'tab-chip';
  chip.title = 'Your bar tab. Click to settle up.';
  const mountChip = () => {
    const hud = document.querySelector('.bar-hud');
    if (hud && chip.parentNode !== hud) hud.prepend(chip);
  };

  function bill() {
    const groups = new Map();
    for (const it of state.items) {
      const g = groups.get(it.id) || { ...it, qty: 0 };
      g.qty++;
      groups.set(it.id, g);
    }
    const sub = state.items.reduce((s, it) => s + it.price, 0);
    const n = state.items.length;
    const fees = [
      ['Sparkler fuel (25%)', Math.round(sub * 0.25)],
      [`Glass rental x${n}`, 2 * n],
      ['Ice, hand-carved', 4],
      ['Waiter emotional damage', 7],
      ['Card machine warm-up', 3],
    ];
    const beforeTip = sub + fees.reduce((s, [, v]) => s + v, 0);
    const tip = Math.round(beforeTip * 0.22);
    const total = beforeTip + tip;
    const when = new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const rows = [
      { kind: 'title', text: 'CLUB JACKPOT' },
      { kind: 'center', text: '*** BAR TAB ***' },
      { kind: 'small', text: `${when}  ·  TABLE 7` },
      { kind: 'small', text: 'Server: The Waiter (mustache)' },
      { kind: 'sep' },
      ...[...groups.values()].map((g) => ({ kind: 'row', text: `${g.qty}x ${g.name}`, value: money(g.qty * g.price) })),
      { kind: 'sep' },
      { kind: 'row', text: 'Subtotal', value: money(sub) },
      ...fees.map(([text, v]) => ({ kind: 'row', text, value: money(v) })),
      { kind: 'row', text: 'Tip (mandatory, 22%)', value: money(tip) },
      { kind: 'sep' },
      { kind: 'total', text: 'TOTAL', value: money(total) },
      { kind: 'sep' },
      { kind: 'small', text: 'Thank you for drinking responsibly-ish' },
      { kind: 'small', text: 'No refunds. No water. No regrets.' },
      { kind: 'barcode' },
    ];
    return { rows, total };
  }

  const banLeft = () => Math.max(0, Math.ceil((state.banUntil - Date.now()) / 1000));

  function render() {
    mountChip();
    const ban = banLeft();
    chip.hidden = !state.items.length && !ban;
    chip.classList.toggle('banned', !!ban && !state.items.length);
    chip.innerHTML = ban && !state.items.length ? `🚫 Bar ban <b>${ban}s</b>` : `🧾 Tab <b>${money(bill().total)}</b>`;
  }
  setInterval(() => banLeft() || chip.classList.contains('banned') ? render() : null, 1000);
  chip.addEventListener('click', () => {
    if (state.items.length) settle();
    else toast(`🚫 Banned from the bar for ${banLeft()}s. The chef says hi.`);
  });

  // ---------- ordering ----------
  function canOrder() {
    const ban = banLeft();
    if (ban) {
      toast(`🚫 You're banned from the bar for ${ban}s. Kitchen's orders.`);
      return false;
    }
    if (open) return false;
    return true;
  }

  function add(it) {
    state.items.push({ id: it.id, name: it.name, emoji: it.emoji, price: it.price });
    save();
    render();
    chip.classList.remove('bump');
    void chip.offsetWidth;
    chip.classList.add('bump');
    if (bill().total >= TAB_LIMIT) {
      clearTimeout(settleTimer);
      settleTimer = setTimeout(() => {
        toast('🧾 The waiter is back. He brought a receipt. A long one.');
        waitThenSettle(1400);
      }, 1500);
    }
  }

  function waitThenSettle(ms) {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(() => (isBusy() ? waitThenSettle(3000) : settle()), ms);
  }

  // ---------- the overlay both scenes live in ----------
  let el = null;
  let scene = null;
  const onKey = (e) => {
    if (e.code === 'Space' || e.code === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  function openOverlay(cls) {
    el = document.createElement('div');
    el.className = `kitchen ${cls}`;
    el.innerHTML = `<div class="k-stage"></div><div class="k-ui"></div>`;
    document.body.appendChild(el);
    document.body.classList.add('kitchen-on');
    requestAnimationFrame(() => el.classList.add('on'));
    addEventListener('keydown', onKey, true);
    pause3d();
    open = true;
  }

  function swapScene(make) {
    scene?.dispose();
    el.querySelector('.k-ui').innerHTML = '';
    scene = make(el.querySelector('.k-stage'));
  }

  function closeOverlay() {
    if (!el) return;
    const dying = el;
    const s = scene;
    el = null;
    scene = null;
    dying.classList.remove('on');
    removeEventListener('keydown', onKey, true);
    setTimeout(() => {
      s?.dispose();
      dying.remove();
      document.body.classList.remove('kitchen-on');
      resume3d();
      open = false;
      render();
    }, 450);
  }

  // ---------- 1. the receipt ----------
  function settle() {
    if (open || !state.items.length) return;
    clearTimeout(settleTimer);
    const { rows, total } = bill();
    openOverlay('k-receipt');
    swapScene(
      (stage) =>
        new ReceiptScene(stage, {
          rows,
          onTick: () => sound.blip(2200 + Math.random() * 900, 0.018, 'square', 0.025),
          onPrinted: () => {
            scene.stamp('UNPAID', '#d11a2a');
            sound.blip(90, 0.25, 'square', 0.18);
            setTimeout(() => choices(total), 450);
          },
        })
    );
    el.querySelector('.k-ui').innerHTML = `<div class="k-caption">🧾 The waiter hands you the bill and does not leave.</div>`;
  }

  function choices(total) {
    if (!el) return;
    const bal = getBalance();
    const broke = bal < total;
    const ui = el.querySelector('.k-ui');
    ui.innerHTML = `
      <div class="k-choices">
        <div class="k-total">You owe <b>${money(total)}</b></div>
        <button type="button" class="btn gold k-pay${broke ? ' broke' : ''}">💳 Pay ${money(total)}${broke ? ` <small>(you have ${money(bal)})</small>` : ''}</button>
        <button type="button" class="btn k-wash">🧽 Wash dishes instead</button>
        <p class="k-fine">Dishes pay ${money(PLATE_PAY)} a plate, ${money(GROSS_PAY)} for anything gross you flick off. ${SHIFT} seconds. No gloves.</p>
      </div>`;
    ui.querySelector('.k-pay').addEventListener('click', (e) => {
      if (getBalance() < total) {
        e.currentTarget.classList.remove('nope');
        void e.currentTarget.offsetWidth;
        e.currentTarget.classList.add('nope');
        sound.blip(160, 0.2, 'sawtooth', 0.1);
        return toast(pick(['💳 Declined. Obviously.', '💳 Your fake card laughed at you.', '💳 Declined. The waiter points at the kitchen.']));
      }
      spend(total);
      sound.cash();
      scene.stamp('PAID', '#1f8a4c');
      ui.innerHTML = '';
      state.items = [];
      save();
      setTimeout(() => scene?.tearOff(() => closeOverlay()), 700);
      toast(pick(['🧾 Tab settled. The waiter almost smiled.', '🧾 Paid in full. He still won\'t bring water.']));
    });
    ui.querySelector('.k-wash').addEventListener('click', () => washDishes(total));
  }

  // ---------- 2. the sink ----------
  function washDishes(owed) {
    let plates = 0;
    let gross = 0;
    let left = SHIFT;
    let chefT = 0;
    const earned = () => plates * PLATE_PAY + gross * GROSS_PAY;
    el.classList.replace('k-receipt', 'k-dishes');
    swapScene(
      (stage) =>
        new DishScene(stage, {
          drunk: booze.level(),
          onPlate: (n) => {
            plates = n;
            sound.blip(1320, 0.12, 'triangle', 0.12);
            sound.blip(1760, 0.18, 'triangle', 0.1, 0.08);
            if (n === 1) shout('ONE PLATE. Wow. Only a hundred to go.');
            else if (n % 4 === 0) shout(pick(['Not bad, rookie!', 'You\'re hired. (Unpaid.)', 'Look at that SHINE ✨']));
            hud();
          },
          onGross: (name) => {
            gross++;
            sound.blip(300, 0.1, 'sawtooth', 0.06);
            shout(`Ew. ${name[0].toUpperCase()}${name.slice(1)}. +${money(GROSS_PAY)}`);
            hud();
          },
          onScrub: () => sound.blip(180 + Math.random() * 120, 0.05, 'triangle', 0.03),
        })
    );
    const ui = el.querySelector('.k-ui');
    ui.innerHTML = `
      <div class="k-hud">
        <div class="k-title">🧽 KITCHEN DUTY</div>
        <div class="k-timer"><i></i></div>
        <div class="k-stats"><b class="k-time">${SHIFT}s</b><span class="k-plates">🍽️ 0</span><span class="k-owed"></span></div>
      </div>
      <div class="k-chef"></div>
      <div class="k-hint">Hold and drag to scrub 🧽</div>`;
    const hud = () => {
      ui.querySelector('.k-plates').textContent = `🍽️ ${plates}`;
      ui.querySelector('.k-owed').innerHTML = `<b>${money(Math.min(owed, earned()))}</b> / ${money(owed)}`;
      ui.querySelector('.k-owed').classList.toggle('done', earned() >= owed);
    };
    const shout = (text) => {
      const c = ui.querySelector('.k-chef');
      if (!c) return;
      c.textContent = `👨‍🍳 ${text}`;
      c.classList.remove('pop');
      void c.offsetWidth;
      c.classList.add('pop');
      chefT = 0;
    };
    hud();
    shout('Tab too big? Plates too dirty. Get scrubbing!');
    el.querySelector('.k-stage').addEventListener('pointerdown', () => ui.querySelector('.k-hint')?.remove(), { once: true });
    music.duck?.(0.4, SHIFT + 2);

    const started = performance.now();
    const clock = setInterval(() => {
      if (!el) return clearInterval(clock);
      left = Math.max(0, SHIFT - (performance.now() - started) / 1000);
      ui.querySelector('.k-time').textContent = `${Math.ceil(left)}s`;
      ui.querySelector('.k-timer i').style.width = `${(left / SHIFT) * 100}%`;
      ui.querySelector('.k-timer').classList.toggle('late', left < 6);
      if ((chefT += 0.1) > 4.5) shout(pick(CHEF_LINES));
      if (left <= 0) {
        clearInterval(clock);
        endShift();
      }
    }, 100);

    function endShift() {
      scene?.stop();
      sound.blip(660, 0.3, 'square', 0.1);
      sound.blip(440, 0.4, 'square', 0.1, 0.25);
      const got = earned();
      const tip = Math.min(MAX_TIP, Math.max(0, got - owed));
      state.items = [];
      let verdict;
      if (got >= owed) {
        if (tip) earn(tip);
        emit('dishes');
        verdict = `<h3>Tab washed off! 🧼</h3><p>${tip ? `The chef was impressed and slipped you a <b>${money(tip)}</b> tip.` : 'Exactly enough. The chef is suspicious.'}</p>`;
      } else {
        state.banUntil = Date.now() + BAN_MS;
        verdict = `<h3>The manager gave up on you.</h3><p>You scrubbed off <b>${money(got)}</b> of <b>${money(owed)}</b>. The rest is written off, but you're <b>banned from the bar for ${BAN_MS / 1000}s</b>.</p>`;
      }
      save();
      ui.querySelector('.k-chef')?.remove();
      ui.insertAdjacentHTML(
        'beforeend',
        `<div class="k-result">
          <div class="k-result-card">
            ${verdict}
            <div class="k-tally"><span>🍽️ ${plates} plate${plates === 1 ? '' : 's'}</span><span>🦐 ${gross} gross thing${gross === 1 ? '' : 's'}</span></div>
            <button type="button" class="btn gold wide k-done">Back to the casino</button>
          </div>
        </div>`
      );
      ui.querySelector('.k-done').addEventListener('click', closeOverlay);
    }
  }

  render();
  return { add, canOrder, settle, isOpen: () => open, total: () => bill().total };
}
