// 🎁 DAILY LOGIN BONUS: $1, delivered via a 30-second unskippable animation.

import { confetti } from './fx.js';

const DURATION = 30_000;
const today = () => new Date().toDateString();

export const bonusDue = (store) =>
  new URLSearchParams(location.search).has('bonus') || store.get('fr.lastBonus', '') !== today();

const el = (cls, html = '', tag = 'div') => {
  const e = document.createElement(tag);
  e.className = cls;
  e.innerHTML = html;
  return e;
};

/** Shows the "your bonus is ready" card; claiming (or declining) starts the ceremony. */
export function offerBonus(ctx) {
  const inv = el(
    'bonus-invite',
    `<div class="bi-card">
      <div class="bi-gift">🎁</div>
      <h2>Your DAILY LOGIN BONUS is ready!</h2>
      <p>A life-changing reward awaits.</p>
      <button type="button" class="bi-claim">CLAIM NOW</button>
      <button type="button" class="bi-no">No thanks</button>
    </div>`
  );
  document.body.appendChild(inv);
  const start = () => {
    inv.remove();
    runCeremony(ctx);
  };
  inv.querySelector('.bi-claim').addEventListener('click', start);
  const no = inv.querySelector('.bi-no');
  no.addEventListener('click', () => {
    no.textContent = 'Declining also takes 30 seconds 🙃';
    no.disabled = true;
    setTimeout(start, 1200);
  });
}

function runCeremony({ store, sound, music, onReward }) {
  const t0 = performance.now();
  const timers = [];
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));
  const every = (ms, fn) => timers.push(setInterval(fn, ms));

  document.body.classList.add('bonus-active');
  music?.duck(0.2, 31);

  const root = el(
    'bonus',
    `<div class="b-rays"></div>
     <div class="b-stage"></div>
     <div class="b-timer">Your reward arrives in <b>0:30</b></div>
     <button type="button" class="b-skip">Skip in 5</button>
     <div class="b-nice"></div>
     <div class="b-ticker"><span>${'UNSKIPPABLE™ ✦ YOUR TIME IS VALUABLE TO US ✦ '.repeat(8)}</span></div>`
  );
  document.body.appendChild(root);
  const stage = root.querySelector('.b-stage');
  const timerEl = root.querySelector('.b-timer b');
  const nice = root.querySelector('.b-nice');

  const scene = (html, cls = '') => {
    stage.innerHTML = `<div class="b-scene ${cls}">${html}</div>`;
    return stage.firstElementChild;
  };
  const ding = (f = 1320) => sound.blip(f, 0.18, 'sine', 0.14);
  const drumroll = (ms) => {
    const steps = Math.floor(ms / 45);
    for (let i = 0; i < steps; i++) {
      at(i * 45, () => sound.blip(90 + Math.random() * 40, 0.05, 'triangle', 0.05 + (i / steps) * 0.2));
    }
  };

  // ---- countdown ----
  every(200, () => {
    const left = Math.max(0, Math.ceil((DURATION - (performance.now() - t0)) / 1000));
    timerEl.textContent = left ? `0:${String(left).padStart(2, '0')}` : 'NOW!';
  });

  // ---- the "skip" button: runs away, resets, never works ----
  const skip = root.querySelector('.b-skip');
  let skipN = 5;
  every(1000, () => {
    skipN = skipN <= 1 ? 5 : skipN - 1;
    skip.textContent = skipN === 5 ? 'Skip in 5 (again)' : `Skip in ${skipN}`;
  });
  const dodge = () => {
    skip.style.right = 'auto';
    skip.style.bottom = 'auto';
    skip.style.left = `${10 + Math.random() * 70}%`;
    skip.style.top = `${12 + Math.random() * 65}%`;
  };
  skip.addEventListener('mouseenter', dodge);
  skip.addEventListener('click', () => {
    skip.textContent = 'lol no';
    skip.classList.remove('nope');
    void skip.offsetWidth;
    skip.classList.add('nope');
    sound.blip(140, 0.25, 'sawtooth', 0.08);
    dodge();
  });

  // ---- keyboard: absolutely not ----
  const block = (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    nice.textContent = pick(['Nice try 😏', 'Unskippable means unskippable', 'Esc? In THIS economy?', 'Patience, high roller']);
    nice.classList.remove('show');
    void nice.offsetWidth;
    nice.classList.add('show');
  };
  window.addEventListener('keydown', block, true);

  // ================= THE CEREMONY =================
  // 0s — title card
  scene(
    `<div class="b-emoji b-bounce">🎁</div>
     <h1 class="b-big">DAILY LOGIN BONUS</h1>
     <p>Congratulations on successfully opening a website.</p>`
  );
  sound.win(1);
  confetti(innerWidth / 2, innerHeight * 0.45, 160);

  // 4s — a progress bar with trust issues
  at(4000, () => {
    const s = scene(`<h2>Calculating your reward…</h2><div class="b-bar"><i></i></div><p class="b-pct">0%</p>`);
    const bar = s.querySelector('i');
    const pct = s.querySelector('.b-pct');
    const t = performance.now();
    const id = setInterval(() => {
      const e = performance.now() - t;
      let p;
      let label;
      if (e < 2200) { p = 99 * (1 - Math.pow(1 - e / 2200, 3)); label = `${p | 0}%`; }
      else if (e < 3400) { p = 99; label = '99%… almost…'; }
      else if (e < 4000) { p = 12; label = '12% (oops, recalculating)'; }
      else { p = Math.min(100, 12 + ((e - 4000) / 900) * 88); label = p >= 100 ? '100% ✅' : `${p | 0}%`; }
      bar.style.width = p + '%';
      pct.textContent = label;
      if (e > 5200) clearInterval(id);
    }, 50);
    timers.push(id);
  });

  // 9.5s — rigorous eligibility checks
  at(9500, () => {
    const s = scene(`<h2>Verifying eligibility…</h2><ul class="b-checks"></ul>`);
    const ul = s.querySelector('ul');
    [
      ['✅', 'Has a pulse'],
      ['✅', 'Opened the website'],
      ['✅', 'Did not skip (could not)'],
      ['❌', 'Tipped the waiter'],
      ['✅', '…we’ll allow it'],
    ].forEach(([icon, text], i) =>
      at(i * 800, () => {
        ul.insertAdjacentHTML('beforeend', `<li><b>${icon}</b> ${text}</li>`);
        icon === '❌' ? sound.blip(160, 0.3, 'square', 0.07) : ding(1100 + i * 110);
      })
    );
  });

  // 14s — the box, shaken vigorously for luck
  at(14000, () => {
    scene(`<div class="b-gift">🎁</div><h2>Shaking the box for good luck…</h2>`, 'b-shaking');
    drumroll(4600);
  });

  // 19s — a word from our sponsor
  at(19000, () => {
    scene(
      `<div class="b-ad">
        <small class="b-ad-top">A MESSAGE FROM OUR SPONSOR</small>
        <h2>Tired of winning?</h2>
        <p>Try <b>SUPER JACKPOT ROULETTE <em>WIN EXTRA BIG</em></b>.<br>It's this. You're already here.</p>
        <div class="b-stars">★★★★★</div>
        <small>“10/10, would lose fake money again” — some guy</small>
        <div class="b-ad-foot">Ad 1 of 1 · ends when it wants</div>
      </div>`
    );
    sound.cash();
  });

  // 23.5s — counting the money (it goes down)
  at(23500, () => {
    const s = scene(`<h2>Counting your money…</h2><div class="b-count">$1,000,000</div>`);
    const out = s.querySelector('.b-count');
    const vals = [1000000, 750000, 420000, 100000, 50000, 9999, 5000, 1200, 500, 250, 99, 42, 20, 7, 3, 2, 1];
    let tt = 0;
    vals.forEach((v, i) => {
      tt += 70 + i * 16;
      at(tt, () => {
        out.textContent = '$' + v.toLocaleString('en-US');
        sound.blip(900 - i * 40, 0.05, 'square', 0.05);
      });
    });
  });

  // 27.5s — THE REVEAL
  at(27500, () => {
    const s = scene(
      `<small class="b-your">YOUR REWARD</small>
       <div class="b-dollar">$1</div>
       <p>Don’t spend it all in one place.</p>
       <button type="button" class="b-claim" disabled>Claim in 3…</button>`
    );
    sound.boom(0.6);
    sound.win(3);
    confetti(innerWidth / 2, innerHeight * 0.5, 260, 1.3);
    at(700, () => confetti(innerWidth * 0.2, innerHeight * 0.6, 120));
    at(1200, () => confetti(innerWidth * 0.8, innerHeight * 0.6, 120));
    const claim = s.querySelector('.b-claim');
    at(900, () => (claim.textContent = 'Claim in 2…'));
    at(1700, () => (claim.textContent = 'Claim in 1…'));
    at(DURATION - 27500, () => {
      claim.disabled = false;
      claim.textContent = 'CLAIM $1 💸';
      root.classList.add('done');
    });
    claim.addEventListener('click', () => finish(claim));
  });

  function finish(from) {
    const r = from.getBoundingClientRect();
    timers.forEach((id) => (clearTimeout(id), clearInterval(id)));
    window.removeEventListener('keydown', block, true);
    store.set('fr.lastBonus', today());
    root.classList.add('out');
    setTimeout(() => {
      root.remove();
      document.body.classList.remove('bonus-active');
    }, 500);
    onReward({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  }
}

const pick = (arr) => arr[(Math.random() * arr.length) | 0];
