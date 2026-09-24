// 🐉 DRAGON RUSH WIN BIG — the slots room. DING DING DING.
// 7×7 CLUSTER PAYS with TUMBLES and MULTIPLIER SPOTS up to ×1024, flaming-pearl FREE SPINS
// where the spots stick, a BUY FREE SPINS button, autoplay and turbo.
// The maths lives in rush-math.js (simulated at ~96% return), the 3D grid in slots3d.js.

import { celebrate, confetti } from './fx.js';
import { DragonRush3D, SYMBOL_INFO } from './slots3d.js';
import { BUY_COST, MULT_MAX, PAYS, SYMS, freeSpinsFor, newGrid, newSpots, playSpin } from './rush-math.js';

const BETS = [10, 20, 50, 100, 200, 500, 1000, 2000, 5000];
const AUTO_SPINS = 10;
// wins are paid in whole dollars (the balance is whole dollars)
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
const load = (k) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const save = (k, v) => {
  try {
    localStorage.setItem(k, v);
  } catch {}
};

export function createSlots({ host, sound, music, getBalance, adjust, toast, onOpen, onClose }) {
  const view = document.createElement('section');
  view.className = 'slots-view';
  view.setAttribute('aria-label', 'Dragon Rush Win Big slot machine');
  view.innerHTML = `
    <div class="dr-canvas"></div>
    <div class="dr-layout">
      <aside class="dr-left">
        <button type="button" class="dr-buy"><small>BUY</small>FREE SPINS<b>$0</b></button>
        <div class="dr-fs"><small>FREE SPINS LEFT</small><b>0</b><em>WIN $0</em></div>
        <ol class="dr-tally" aria-label="Wins this spin"></ol>
      </aside>
      <div class="dr-slot"></div>
      <aside class="dr-right">
        <h2 class="dr-logo" aria-label="Dragon Rush Win Big"><span class="l1">DRAGON</span><span class="l2">RUSH</span><span class="l3">WIN BIG</span></h2>
        <div class="dr-feature">🐉 CLUSTERS OF <b>5+</b> PAY<br>✨ SPOTS GROW TO <b>×1024</b><br>🔥 3+ PEARLS = <b>FREE SPINS</b></div>
      </aside>
      <footer class="dr-bar">
        <button type="button" class="dr-info" aria-label="Paytable and rules">i</button>
        <div class="dr-stat dr-cb"><span>CREDIT</span><b class="dr-credit">$0</b></div>
        <div class="dr-stat dr-bb"><span>BET</span><b class="dr-bet">$0</b></div>
        <div class="dr-winbox"><span class="dr-msg">PLACE YOUR BETS!</span><b class="dr-win">WIN $0</b></div>
        <div class="dr-spinwrap">
          <button type="button" class="dr-round dr-minus" aria-label="Lower bet">−</button>
          <button type="button" class="dr-spin" aria-label="Spin">
            <svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 10a22 22 0 0 1 20.8 14.8H46l9 11 9-11h-6.2A28 28 0 0 0 32 4zM32 54a22 22 0 0 1-20.8-14.8H18l-9-11-9 11h6.2A28 28 0 0 0 32 60z"/></svg>
          </button>
          <button type="button" class="dr-round dr-plus" aria-label="Raise bet">+</button>
        </div>
        <div class="dr-toggles">
          <button type="button" class="dr-auto">AUTO</button>
          <button type="button" class="dr-turbo">⚡ TURBO</button>
        </div>
      </footer>
    </div>
    <button type="button" class="to-roulette">ROULETTE</button>
    <div class="dr-pops"></div>
    <div class="sm-winpop"></div>
    <div class="sm-banner"></div>
    <div class="dr-paytable" hidden>
      <div class="dr-pt-card">
        <button type="button" class="dr-pt-close" aria-label="Close">✕</button>
        <h3>DRAGON RUSH WIN BIG · PAYTABLE</h3>
        <table><thead></thead><tbody></tbody></table>
        <ul>
          <li><b>Cluster pays:</b> 5 or more matching symbols touching up, down, left or right. Wins are × your total bet.</li>
          <li><b>Tumble:</b> winning symbols explode, everything falls, new symbols drop in. Repeat until no more wins.</li>
          <li><b>Multiplier spots:</b> a spot lights up the first time a win explodes on it. Next time it becomes <b>×2</b>, then doubles every hit up to <b>×1024</b>. A cluster over lit spots is multiplied by the sum of their multipliers.</li>
          <li><b>🔥 Flaming pearl (scatter):</b> 3/4/5/6/7 anywhere = <b>10/12/15/20/30 FREE SPINS</b>. In free spins the multiplier spots <b>stay for the whole bonus</b>. Retriggers welcome.</li>
          <li><b>Buy free spins:</b> ${BUY_COST}× your bet for 10 free spins.</li>
          <li>Simulated return to player ≈ 96%. The money is fake. The dragon is real (in our hearts).</li>
        </ul>
      </div>
    </div>`;
  host.appendChild(view);

  const $$ = (s) => view.querySelector(s);
  const spinBtn = $$('.dr-spin');
  const popEl = $$('.sm-winpop');
  const banner = $$('.sm-banner');
  const pops = $$('.dr-pops');
  const tally = $$('.dr-tally');
  const buyBtn = $$('.dr-buy');
  const autoBtn = $$('.dr-auto');
  const turboBtn = $$('.dr-turbo');
  const paytable = $$('.dr-paytable');
  const msg = $$('.dr-msg');

  const machine = new DragonRush3D($$('.dr-canvas'), { slotEl: $$('.dr-slot') });
  machine.setGrid(newGrid().map((col) => col.map((s) => (s === 'pearl' ? 'jade' : s))));

  let betIdx = 1;
  let busy = false;
  let open = false;
  let moving = false;
  let free = 0;
  let inBonus = false;
  let freeBet = 0;
  let freeWin = 0;
  let fsSpots = newSpots();
  let autoLeft = 0;
  let turbo = load('fr.turbo') === '1';
  let buyArmed = 0;
  let joked = false;
  let shownWin = 0;
  machine.speed = turbo ? 2.2 : 1;

  // icons (rendered once from the real 3D symbols) for the tally + paytable
  let icons = null;
  const icon = (id) => {
    try {
      icons ||= machine.icons();
    } catch {
      icons = {};
    }
    return icons[id] ? `<img src="${icons[id]}" alt="${SYMBOL_INFO[id].name}">` : '';
  };
  function buildPaytable() {
    const sizes = [5, 6, 7, 8, 9, 10, 12, 15];
    $$('.dr-paytable thead').innerHTML = `<tr><th></th>${sizes.map((n) => `<th>${n === 15 ? '15+' : n}</th>`).join('')}</tr>`;
    $$('.dr-paytable tbody').innerHTML =
      [...SYMS]
        .reverse()
        .map((id) => `<tr><td>${icon(id)}</td>${sizes.map((n) => `<td>${PAYS[id][Math.min(n, 15) - 5]}×</td>`).join('')}</tr>`)
        .join('') + `<tr><td>${icon('pearl')}</td><td colspan="${sizes.length}" class="dr-pt-scatter">3+ anywhere = FREE SPINS</td></tr>`;
  }

  function renderDisplay() {
    const bal = getBalance();
    if (!busy && !free) while (betIdx > 0 && BETS[betIdx] > bal) betIdx--;
    $$('.dr-credit').textContent = money(bal);
    $$('.dr-bet').textContent = money(inBonus ? freeBet : BETS[betIdx]);
    spinBtn.disabled = busy || moving || free > 0 || (!inBonus && bal < BETS[betIdx]);
    view.classList.toggle('busy', busy);
    view.classList.toggle('freespins', inBonus);
    $$('.dr-fs b').textContent = free;
    $$('.dr-fs em').textContent = `WIN ${money(freeWin)}`;
    buyBtn.querySelector('b').textContent = buyArmed ? `SURE? ${money(BUY_COST * BETS[betIdx])}` : money(BUY_COST * BETS[betIdx]);
    buyBtn.classList.toggle('armed', !!buyArmed);
    buyBtn.disabled = busy || inBonus;
    autoBtn.textContent = autoLeft ? `STOP ${autoLeft}` : 'AUTO';
    autoBtn.classList.toggle('on', autoLeft > 0);
    turboBtn.classList.toggle('on', turbo);
    $$('.dr-minus').disabled = $$('.dr-plus').disabled = busy || inBonus;
  }
  const setMsg = (t) => (msg.textContent = t);
  function setWin(target) {
    const from = shownWin;
    shownWin = target;
    if (!target) {
      $$('.dr-win').textContent = 'WIN $0';
      return;
    }
    const t0 = performance.now();
    (function count(now) {
      const u = Math.min((now - t0) / 450, 1);
      $$('.dr-win').textContent = `WIN ${money(from + (target - from) * u)}`;
      if (u < 1) requestAnimationFrame(count);
    })(t0);
  }

  // ---------- buttons ----------
  const bump = (f) => sound.blip(f, 0.06, 'square', 0.06);
  $$('.dr-minus').addEventListener('click', () => {
    if (busy || inBonus) return;
    betIdx = Math.max(0, betIdx - 1);
    bump(700);
    renderDisplay();
  });
  $$('.dr-plus').addEventListener('click', () => {
    if (busy || inBonus) return;
    if (betIdx < BETS.length - 1 && BETS[betIdx + 1] <= getBalance()) betIdx++;
    else toast('That is all the dragon will let you bet right now. 🐉');
    bump(900);
    renderDisplay();
  });
  spinBtn.addEventListener('click', () => spin());
  autoBtn.addEventListener('click', () => {
    if (autoLeft) {
      autoLeft = 0;
      toast('Autoplay stopped.');
    } else {
      autoLeft = AUTO_SPINS;
      toast(`🤖 AUTOPLAY: ${AUTO_SPINS} spins. Sit back and let the dragon cook.`);
      if (!busy && !inBonus) {
        autoLeft--;
        spin();
      }
    }
    renderDisplay();
  });
  turboBtn.addEventListener('click', () => {
    turbo = !turbo;
    machine.speed = turbo ? 2.2 : 1;
    save('fr.turbo', turbo ? '1' : '0');
    sound.blip(turbo ? 1400 : 600, 0.1, 'square', 0.07);
    toast(turbo ? '⚡ TURBO! Gravity doubled. Physics has left the chat.' : 'Turbo off. Gravity restored.');
    renderDisplay();
  });
  buyBtn.addEventListener('click', () => {
    if (busy || inBonus || moving) return;
    const bet = BETS[betIdx];
    const cost = BUY_COST * bet;
    if (getBalance() < cost) {
      toast(`Buying the bonus costs ${money(cost)}. Lower the bet, or… 📺`);
      return;
    }
    if (!buyArmed) {
      buyArmed = setTimeout(() => {
        buyArmed = 0;
        renderDisplay();
      }, 3500);
      sound.blip(500, 0.1, 'square', 0.07);
      renderDisplay();
      return;
    }
    clearTimeout(buyArmed);
    buyArmed = 0;
    autoLeft = 0;
    adjust(-cost);
    sound.cash?.();
    freeBet = bet;
    awardFree(10, '💸 BONUS BOUGHT 💸');
    setTimeout(() => open && !busy && free > 0 && spin(), 2600);
  });
  $$('.dr-info').addEventListener('click', () => {
    buildPaytable();
    paytable.hidden = false;
  });
  $$('.dr-pt-close').addEventListener('click', () => (paytable.hidden = true));
  paytable.addEventListener('click', (e) => e.target === paytable && (paytable.hidden = true));

  // ---------- sounds ----------
  const bell = (f, delay = 0, vol = 0.13) => {
    sound.blip(f, 0.9, 'sine', vol, delay);
    sound.blip(f * 2.76, 0.35, 'sine', vol * 0.35, delay);
    sound.blip(f * 5.4, 0.12, 'sine', vol * 0.15, delay);
  };
  const dingding = (n) => {
    for (let i = 0; i < n; i++) bell(i % 2 ? 1568 : 2093, i * 0.11, 0.12);
  };
  const gong = (delay = 0) => {
    sound.boom(0.6, delay);
    [110, 164, 247, 330].forEach((f, i) => sound.blip(f * (1 + Math.random() * 0.01), 2.4 - i * 0.4, 'sine', 0.08, delay));
  };
  const land = (c) => sound.blip(150 - c * 8, 0.08, 'triangle', 0.09);
  const pop = (n) => {
    const root = 523 * 2 ** (Math.min(n - 1, 10) / 12);
    [1, 1.25, 1.5, 2].forEach((k, i) => sound.blip(root * k, 0.18, 'square', 0.05, i * 0.035));
    sound.boom(0.25);
  };
  const chime = (v) => {
    const f = 660 * 2 ** (Math.log2(v) / 5);
    bell(f, 0, 0.12);
    bell(f * 1.5, 0.08, 0.1);
  };
  const roar = () => {
    sound.boom(0.9);
    for (let i = 0; i < 14; i++) sound.blip(90 + Math.random() * 60, 0.12, 'sawtooth', 0.07, i * 0.05);
  };
  const siren = () => {
    for (let i = 0; i < 10; i++) {
      sound.blip(660, 0.2, 'square', 0.05, i * 0.4);
      sound.blip(990, 0.2, 'square', 0.05, i * 0.4 + 0.2);
    }
  };
  const whoosh = () => {
    for (let i = 0; i < 8; i++) sound.blip(900 - i * 90, 0.05, 'triangle', 0.04, i * 0.02);
  };
  function footsteps(n, gap) {
    if (sound.muted) return;
    const c = sound.ensure();
    for (let i = 0; i < n; i++) {
      const t = c.currentTime + i * gap;
      const src = c.createBufferSource();
      src.buffer = sound.noiseBuf();
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 420 + (i % 2) * 160;
      const g = c.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.7, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      src.connect(lp).connect(g).connect(sound.bus());
      src.start(t, Math.random(), 0.2);
      sound.blip(72 - (i % 2) * 9, 0.13, 'sine', 0.3, i * gap);
    }
  }

  // ---------- big slams + floating numbers ----------
  let bannerTimer;
  function slam(html, cls = '', ms = 1600) {
    banner.innerHTML = html;
    banner.className = `sm-banner show ${cls}`;
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => (banner.className = 'sm-banner'), ms);
    machine.kick(0.35);
  }
  function floatPop(cl) {
    const el = document.createElement('div');
    el.className = 'dr-pop' + (cl.mult > 1 ? ' mult' : '');
    el.style.left = `${cl.at.x}px`;
    el.style.top = `${cl.at.y}px`;
    el.innerHTML = `${money(cl.win)}${cl.mult > 1 ? `<small>×${cl.mult}</small>` : ''}`;
    pops.appendChild(el);
    setTimeout(() => el.remove(), 1700);
  }
  function addTally(cl) {
    const li = document.createElement('li');
    li.innerHTML = `<span>${cl.cells.length}</span>${icon(cl.sym)}${cl.mult > 1 ? `<em>×${cl.mult}</em>` : ''}<b>${money(cl.win)}</b>`;
    tally.prepend(li);
    while (tally.children.length > 7) tally.lastChild.remove();
  }

  // ---------- the spin ----------
  async function spin() {
    if (busy || !open || moving) return;
    paytable.hidden = true;
    const isFree = free > 0;
    const bet = isFree ? freeBet : BETS[betIdx];
    if (!isFree && getBalance() < bet) {
      autoLeft = 0;
      toast('Not enough credit! Lower the bet, or… 📺');
      machine.kick(0.2);
      renderDisplay();
      return;
    }
    busy = true;
    if (isFree) free--;
    else adjust(-bet);
    tally.innerHTML = '';
    setWin(0);
    popEl.className = 'sm-winpop';
    setMsg(isFree ? `FREE SPIN! ${free} LEFT` : 'GOOD LUCK! 🐉');
    if (!isFree) machine.resetSpots();
    renderDisplay();

    const res = playSpin({ bet, spots: isFree ? fsSpots : newSpots(), free: isFree });
    whoosh();
    await machine.dropOut();
    let pearlsSoFar = 0;
    await machine.dropIn(res.start, (c) => {
      land(c);
      const p = res.start[c].filter((s) => s === 'pearl').length;
      if (p) {
        pearlsSoFar += p;
        bell(880 + pearlsSoFar * 220, 0, 0.14);
        if (pearlsSoFar >= 2) machine.kick(0.1);
      }
    });

    let run = 0;
    let n = 0;
    for (const step of res.steps) {
      n++;
      for (const cl of step.clusters) cl.at = machine.screenOf(cl.cells);
      await Promise.all(step.clusters.map((cl) => machine.explode(cl.cells, SYMBOL_INFO[cl.sym].color)));
      pop(n);
      step.clusters.forEach((cl) => {
        floatPop(cl);
        addTally(cl);
      });
      run += step.win;
      setWin(run);
      setMsg(n > 1 ? `TUMBLE ×${n}! 💥` : 'WIN!');
      let top = 0;
      for (const { c, r, v } of step.spotChanges) {
        machine.setSpot(c, r, v);
        top = Math.max(top, v);
      }
      if (top >= 2) chime(top);
      if (top >= MULT_MAX && !joked) {
        joked = true;
        setTimeout(absurd, 300);
      }
      machine.kick(0.05 + 0.04 * n);
      if (n === 3) slam(`<small>BOOM!</small>TUMBLE ×3<em>💥 KEEP GOING 💥</em>`, 'combo c2', 1100);
      if (n === 5) slam(`<small>🔥 YOU ARE ON A ROLL! 🔥</small>TUMBLE ×5`, 'combo c3', 1300);
      if (n >= 7 && n % 2 === 1) slam(`<small>WHAT IS HAPPENING</small>TUMBLE ×${n}`, 'combo c4', 1300);
      await machine.wait(260);
      await machine.tumble(step, (c) => land(c));
    }

    const win = Math.round(res.total);
    if (win) adjust(win);
    if (isFree) freeWin += win;
    setWin(win);
    const x = win / bet;
    if (win) {
      const level = x >= 50 ? 3 : x >= 20 ? 2 : x >= 8 ? 1 : 0;
      setMsg(level >= 2 ? 'MEGA DRAGON WIN!!' : level ? 'BIG WIN!' : `YOU WON ${money(win)}`);
      if (level) {
        popEl.innerHTML = `<small>${['', 'BIG WIN', 'MEGA WIN', 'DRAGON JACKPOT'][level]}</small>+${money(win)}<em>${x.toFixed(1)}× YOUR BET</em>`;
        popEl.className = 'sm-winpop show big';
        celebrate({ net: win - (isFree ? 0 : bet), level, origin: { x: innerWidth / 2, y: innerHeight * 0.4 } });
        sound.win(level);
        music?.duck(0.3, 2 + level);
        machine.swoop();
        if (level >= 2) roar();
        if (level >= 3) siren();
      } else {
        dingding(Math.min(10, 2 + n));
        confetti(innerWidth / 2, innerHeight * 0.45, 40 + n * 20, 0.7);
      }
    } else {
      setMsg(isFree ? `FREE SPIN · ${free} LEFT` : 'SO CLOSE. SPIN AGAIN!');
      sound.blip(220, 0.18, 'triangle', 0.06);
    }

    // 🔥 flaming pearls → free spins
    const fs = freeSpinsFor(res.pearls);
    if (fs) {
      autoLeft = 0;
      await machine.highlight(machine.cellsOf('pearl'));
      if (!isFree) freeBet = bet;
      awardFree(fs, `🔥 ${res.pearls} FLAMING PEARLS 🔥`, isFree);
    }
    busy = false;
    if (isFree && free === 0 && !fs) setTimeout(endFree, 700);
    renderDisplay();

    if (free > 0) setTimeout(() => open && !busy && free > 0 && spin(), fs ? 3000 : 1100);
    else if (autoLeft > 0 && !fs) {
      setTimeout(() => {
        if (!open || busy || autoLeft <= 0) return;
        autoLeft--;
        spin();
      }, 700);
    }
  }

  function awardFree(n, reason, retrigger = false) {
    if (!retrigger) {
      fsSpots = newSpots();
      freeWin = 0;
      machine.resetSpots();
    }
    inBonus = true;
    free += n;
    gong();
    dingding(12);
    roar();
    machine.setMode(true);
    machine.swoop();
    slam(`<small>${reason}</small>${retrigger ? '+' : ''}${n} FREE SPINS<em>MULTIPLIERS STICK!</em>`, 'free', 2600);
    confetti(innerWidth / 2, innerHeight * 0.4, 220, 1.2);
    setMsg(`${free} FREE SPINS!`);
    renderDisplay();
  }
  function endFree() {
    inBonus = false;
    machine.setMode(false);
    const x = freeWin / freeBet;
    slam(`<small>FREE SPINS OVER</small>${money(freeWin)}<em>${x.toFixed(1)}× YOUR BET</em>`, 'free', 3000);
    setMsg(`BONUS PAID ${money(freeWin)}!`);
    if (x >= 10) {
      const level = x >= 100 ? 3 : x >= 40 ? 2 : 1;
      setTimeout(() => celebrate({ net: freeWin, level, origin: { x: innerWidth / 2, y: innerHeight * 0.4 } }), 900);
    } else dingding(6);
    renderDisplay();
  }
  function absurd() {
    roar();
    gong(0.3);
    machine.swoop();
    slam(`<small>🐉 ×1024 DRAGON SPOT 🐉</small><span class="absurd">MULTIPLIER ×100000000000000000000000000000000000000</span>`, 'dragon', 2600);
    setTimeout(() => slam(`<small>…the Dragon Tax Office has capped this at</small>×${MULT_MAX}<em>STILL PRETTY BIG</em>`, 'combo', 2200), 2700);
  }

  // ---------- walking between rooms ----------
  const WALK_STEPS = 6;
  const WALK_GAP = 0.27;
  function walk(then) {
    moving = true;
    document.body.classList.add('walking');
    footsteps(WALK_STEPS, WALK_GAP);
    setTimeout(() => {
      document.body.classList.remove('walking');
      moving = false;
      renderDisplay();
      then?.();
    }, WALK_STEPS * WALK_GAP * 1000);
  }
  const fitHeight = () => view.style.setProperty('--top', `${host.getBoundingClientRect().top + scrollY}px`);
  addEventListener('resize', () => open && fitHeight());
  function show() {
    if (open || moving) return;
    open = true;
    fitHeight();
    machine.start();
    renderDisplay();
    view.classList.add('open');
    document.body.classList.add('in-slots');
    music?.setSong?.('slots');
    onOpen?.();
    walk(() => {
      machine.resize();
      gong();
      dingding(8);
      toast('🐉 Welcome to DRAGON RUSH WIN BIG! Spin it!');
      if (free) setTimeout(() => spin(), 800);
    });
  }
  function hide() {
    if (!open || busy || moving) return;
    open = false;
    autoLeft = 0;
    view.classList.remove('open');
    document.body.classList.remove('in-slots');
    music?.setSong?.('lobby');
    onClose?.();
    walk(() => machine.stop());
  }
  $$('.to-roulette').addEventListener('click', hide);

  return { show, hide, spin: () => spin(), isOpen: () => open, refresh: renderDisplay };
}
