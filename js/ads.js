// 📺 WATCH AN AD, GET $100 — only for the truly broke. Totally real sponsors.

import { confetti } from './fx.js';

const pick = (arr) => arr[(Math.random() * arr.length) | 0];

const ADS = [
  {
    brand: 'HOT SINGLES 🎲',
    hero: '🎲',
    heroCls: 'ad-bounce',
    title: 'Hot singles in your area!',
    body: "They're dice. Single dice. Very close to you. Some of them are loaded.",
    cta: 'ROLL NOW',
    bg: 'linear-gradient(135deg, #ff2d8a, #7b2dff)',
  },
  {
    brand: 'WAITER ACADEMY™',
    hero: '🤵',
    heroCls: 'ad-walk',
    title: 'Learn to walk past tables. Professionally.',
    body: '100% of our graduates have never stopped at a table. Enrol today, never serve tomorrow.',
    cta: 'ENROL NOW',
    bg: 'linear-gradient(135deg, #111, #3a3a3a)',
  },
  {
    brand: "GRANDMA'S COOKIES",
    hero: '🍪',
    heroCls: 'ad-spin',
    title: 'Grandma is worried about you.',
    body: 'Have a cookie. Call her. She saw your balance and she is not mad, just disappointed.',
    cta: 'CALL GRANDMA',
    bg: 'linear-gradient(135deg, #f7b267, #f25c54)',
  },
  {
    brand: 'WHEEL NFT CLUB',
    hero: '🖼️',
    heroCls: 'ad-bounce',
    title: 'Own a JPEG of a roulette wheel!',
    body: 'Only 0.5 ETH. It does not spin. It will spin in your heart. Right-click-save is theft (probably).',
    cta: 'MINT NOW',
    bg: 'linear-gradient(135deg, #00d4a0, #0066ff)',
  },
  {
    brand: 'DOWNLOADMOREMONEY.biz',
    hero: '💾',
    heroCls: 'ad-spin',
    title: 'Tired of being broke? DOWNLOAD MORE MONEY!',
    body: '100% legit.* Works on all devices.** Your bank will hate this one weird trick.***',
    fine: '*not legit **not a thing ***your bank is fine',
    cta: 'DOWNLOAD $$$',
    bg: 'linear-gradient(135deg, #22c55e, #065f46)',
  },
  {
    brand: 'FAKE MONEY INSURANCE CO.',
    hero: '🛡️',
    heroCls: 'ad-bounce',
    title: 'Protect your fake money with fake insurance.',
    body: 'Premiums from $0.00 (fake). Claims paid out in thoughts and prayers.',
    cta: 'GET A QUOTE',
    bg: 'linear-gradient(135deg, #2563eb, #1e1b4b)',
  },
  {
    brand: 'LUCKY SOCKS',
    hero: '🧦',
    heroCls: 'ad-spin',
    title: 'Scientifically* proven to land on red.',
    body: 'Wear them on your hands for double luck. Machine washable. Luck not included.',
    fine: '*not scientifically',
    cta: 'BUY 2 PAIRS',
    bg: 'linear-gradient(135deg, #ef4444, #7f1d1d)',
  },
];

const REWARD = 100;
const AD1 = 10_000; // "Ad 1 of 1"
const AD2 = 5_000; // "Ad 2 of 1" (surprise)

export function watchAd({ sound, music, onReward }) {
  const first = pick(ADS);
  const second = pick(ADS.filter((a) => a !== first));
  const t0 = performance.now();
  const total = AD1 + AD2;
  const timers = [];
  const at = (ms, fn) => timers.push(setTimeout(fn, ms));
  const every = (ms, fn) => timers.push(setInterval(fn, ms));

  document.body.classList.add('bonus-active'); // keeps the waiter away
  music?.duck(0.15, total / 1000 + 1);

  const root = document.createElement('div');
  root.className = 'adbreak';
  root.innerHTML = `
    <div class="ad-top"><span class="ad-label">AD</span> <span class="ad-count">1 of 1</span> · Your <b>$${REWARD}</b> in <b class="ad-left">15</b>s</div>
    <div class="ad-frame"></div>
    <button type="button" class="ad-skip">Skip ad in 5</button>
    <div class="ad-progress"><i></i></div>`;
  document.body.appendChild(root);
  const frame = root.querySelector('.ad-frame');
  const bar = root.querySelector('.ad-progress i');
  const leftEl = root.querySelector('.ad-left');

  const show = (ad) => {
    root.style.setProperty('--ad-bg', ad.bg);
    frame.innerHTML = `
      <div class="ad-card">
        <div class="ad-brand">${ad.brand}</div>
        <div class="ad-hero ${ad.heroCls}">${ad.hero}</div>
        <h2>${ad.title}</h2>
        <p>${ad.body}</p>
        <div class="ad-cta">${ad.cta} ☎ 1-800-NOT-REAL</div>
        ${ad.fine ? `<small class="ad-fine">${ad.fine}</small>` : ''}
        <div class="ad-burst">NEW!</div>
      </div>`;
    sound.cash();
  };

  show(first);
  every(100, () => {
    const e = performance.now() - t0;
    bar.style.width = Math.min(100, (e / total) * 100) + '%';
    leftEl.textContent = Math.max(0, Math.ceil((total - e) / 1000));
  });

  // the plot twist
  at(AD1, () => {
    root.querySelector('.ad-count').textContent = '2 of 1';
    root.classList.add('twist');
    show(second);
  });

  // the skip button: counts down, then refuses
  const skip = root.querySelector('.ad-skip');
  let n = 5;
  let ready = false;
  every(1000, () => {
    if (ready) return;
    n--;
    if (n <= 0) {
      ready = true;
      skip.textContent = 'Skip ad ▸▸';
      skip.classList.add('ready');
    } else skip.textContent = `Skip ad in ${n}`;
  });
  skip.addEventListener('click', () => {
    if (!ready) return;
    ready = false;
    n = 5;
    skip.classList.remove('ready');
    skip.textContent = pick(['Ha. No.', 'Skipping forfeits your dignity', 'Nice try 😏', 'The sponsors are watching']);
    sound.blip(140, 0.25, 'sawtooth', 0.08);
  });

  const block = (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
  };
  window.addEventListener('keydown', block, true);

  // payday
  at(total, () => {
    timers.forEach((id) => (clearTimeout(id), clearInterval(id)));
    bar.style.width = '100%';
    leftEl.textContent = '0';
    skip.remove();
    frame.insertAdjacentHTML(
      'beforeend',
      `<div class="ad-done"><div>Thank you for your attention!</div><button type="button" class="ad-claim">💵 CLAIM $${REWARD}</button></div>`
    );
    confetti(innerWidth / 2, innerHeight * 0.55, 160);
    sound.win(1);
    frame.querySelector('.ad-claim').addEventListener('click', (e) => {
      const r = e.currentTarget.getBoundingClientRect();
      window.removeEventListener('keydown', block, true);
      root.classList.add('out');
      setTimeout(() => {
        root.remove();
        document.body.classList.remove('bonus-active');
      }, 450);
      onReward({ x: r.left + r.width / 2, y: r.top + r.height / 2 }, REWARD);
    });
  });
}
