// 🍸 FREE DRINKS: a waiter walks past every 30 seconds. He never stops at your table,
// but you can snatch drinks off his tray, and sometimes he throws you one.

const pick = (arr) => arr[(Math.random() * arr.length) | 0];

const LINES = [
  'Free drinks! 🍸',
  'Be right with you!',
  'Not your table, sorry',
  'Who ordered the martini?',
  'Back in 30 seconds. Probably.',
  'Tipping is appreciated 😉',
  'Sorry, VIP only',
  'Drinks are free. Walking to you is extra.',
  'Is this table 7?',
  'Hot tray! Hot tray!',
  'Your drink is on its way (to someone else)',
];
const CLICK_LINES = [
  'Please wait for your server',
  'Not my section!',
  'I see you. I am ignoring you.',
  'One moment! (lie)',
  "Sir, this is a roulette table",
  'Busy busy busy!',
];

// weight, duration, css class, opening line, extras
const MODES = [
  { w: 36, dur: 9000, cls: '', line: () => pick(LINES) },
  { w: 14, dur: 3200, cls: 'sprint', line: () => 'Coming through! 🏃' },
  { w: 12, dur: 10500, cls: 'moon', moon: true, line: () => 'Smooth criminal 😎' },
  { w: 10, dur: 14000, cls: 'tiptoe', line: () => 'shhh… 🤫' },
  { w: 10, dur: 5200, cls: 'skates', line: () => 'Wheeee! 🛼' },
  { w: 18, dur: 11500, cls: '', stop: true, line: () => 'Free drinks! 🍸' },
];
const pickMode = () => {
  let r = Math.random() * MODES.reduce((s, m) => s + m.w, 0);
  for (const m of MODES) if ((r -= m.w) < 0) return m;
  return MODES[0];
};

// Drawn facing right; flipped with --face for walking left.
const WAITER_SVG = `
<svg viewBox="0 0 140 240" aria-hidden="true">
  <defs>
    <linearGradient id="wTiki" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffcf3f"/><stop offset="1" stop-color="#ff5a1f"/>
    </linearGradient>
    <linearGradient id="wTray" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#9aa0a8"/>
    </linearGradient>
  </defs>
  <g class="w-leg w-leg-b">
    <rect x="66" y="148" width="15" height="64" rx="4" fill="#0d0d0d"/>
    <ellipse cx="78" cy="214" rx="13" ry="6" fill="#000"/>
    <g class="w-skate"><rect x="64" y="218" width="28" height="5" rx="2" fill="#ff2d9a"/><circle cx="69" cy="226" r="4" fill="#ffd23f"/><circle cx="87" cy="226" r="4" fill="#ffd23f"/></g>
  </g>
  <g class="w-leg w-leg-a">
    <rect x="54" y="148" width="15" height="64" rx="4" fill="#161616"/>
    <ellipse cx="66" cy="214" rx="13" ry="6" fill="#050505"/>
    <g class="w-skate"><rect x="52" y="218" width="28" height="5" rx="2" fill="#2de0ff"/><circle cx="57" cy="226" r="4" fill="#ffd23f"/><circle cx="75" cy="226" r="4" fill="#ffd23f"/></g>
  </g>
  <!-- jacket with tails -->
  <path d="M40 92 Q70 78 100 92 L106 150 L92 172 L84 152 L56 152 L48 172 L34 150 Z" fill="#181818"/>
  <path d="M58 86 L82 86 L70 128 Z" fill="#fff"/>
  <path d="M70 90 L60 84 L60 96 Z M70 90 L80 84 L80 96 Z" fill="#e0142c"/>
  <circle cx="70" cy="90" r="2.6" fill="#a00"/>
  <circle cx="70" cy="108" r="1.8" fill="#222"/><circle cx="70" cy="118" r="1.8" fill="#222"/>
  <!-- red cummerbund -->
  <rect x="44" y="138" width="54" height="8" rx="2" fill="#b3122a"/>
  <!-- left arm with towel -->
  <path d="M44 96 Q30 120 40 142" stroke="#181818" stroke-width="12" fill="none" stroke-linecap="round"/>
  <rect x="31" y="128" width="14" height="22" rx="3" fill="#f4f4f4" transform="rotate(-8 38 139)"/>
  <circle cx="41" cy="146" r="6" fill="#f1c27d"/>
  <!-- right arm up to the tray -->
  <path d="M96 98 Q116 84 118 62" stroke="#181818" stroke-width="12" fill="none" stroke-linecap="round"/>
  <circle cx="118" cy="58" r="6.5" fill="#f1c27d"/>
  <g class="w-tray">
    <g class="w-d w-d1">
    <!-- martini -->
    <path d="M90 22 L110 22 L100 36 Z" fill="rgba(170,225,255,0.85)" stroke="#fff" stroke-width="1"/>
    <line x1="100" y1="36" x2="100" y2="50" stroke="#e8f4ff" stroke-width="2"/>
    <line x1="94" y1="50" x2="106" y2="50" stroke="#e8f4ff" stroke-width="2"/>
    <circle cx="97" cy="28" r="3" fill="#6fae2f"/><circle cx="97" cy="28" r="1.2" fill="#e0142c"/>
    </g><g class="w-d w-d2">
    <!-- tiki drink with umbrella -->
    <rect x="114" y="28" width="13" height="22" rx="2" fill="url(#wTiki)" stroke="#fff" stroke-width="1"/>
    <line x1="122" y1="28" x2="126" y2="12" stroke="#8b5a2b" stroke-width="1.5"/>
    <path d="M116 14 Q126 4 136 14 Z" fill="#ff3d9a"/>
    </g><g class="w-d w-d3">
    <!-- champagne flute -->
    <path d="M130 30 L134 30 L133 44 L131 44 Z" fill="rgba(255,220,120,0.9)" stroke="#fff" stroke-width="0.8"/>
    <line x1="132" y1="44" x2="132" y2="50" stroke="#fff" stroke-width="1.5"/>
    </g>
    <ellipse cx="112" cy="52" rx="30" ry="5" fill="url(#wTray)" stroke="#7d838b" stroke-width="1"/>
  </g>
  <!-- head -->
  <circle cx="70" cy="60" r="19" fill="#f1c27d"/>
  <path d="M51 56 Q52 38 70 38 Q88 38 89 56 Q84 46 70 46 Q58 46 51 56 Z" fill="#1d130c"/>
  <path d="M60 52 L66 50 M74 50 L80 52" stroke="#1d130c" stroke-width="2.2" stroke-linecap="round"/>
  <circle cx="63" cy="57" r="2.4" fill="#111"/><circle cx="77" cy="57" r="2.4" fill="#111"/>
  <circle cx="63.8" cy="56.2" r="0.8" fill="#fff"/><circle cx="77.8" cy="56.2" r="0.8" fill="#fff"/>
  <!-- magnificent curly mustache -->
  <path d="M70 66 Q62 62 56 66 Q52 70 48 66 Q52 74 60 70 Q66 69 70 67 Q74 69 80 70 Q88 74 92 66 Q88 70 84 66 Q78 62 70 66 Z" fill="#3a220f"/>
  <path d="M64 73 Q70 77 76 73" stroke="#9c4a2f" stroke-width="1.8" fill="none" stroke-linecap="round"/>
  <circle cx="58" cy="67" r="3" fill="rgba(255,120,120,0.35)"/><circle cx="82" cy="67" r="3" fill="rgba(255,120,120,0.35)"/>
</svg>`;

const SNATCH_LINES = [
  'Hey! That was for table 7!',
  'Excuse me?! 😤',
  'Fine. FINE. Enjoy.',
  "That's coming out of my tips",
  'Wow. Just grab it, I guess.',
  'I saw that.',
];
const EMPTY_LINES = ['Tray is empty, pal', 'You drank it all 😳', 'No more! Go home!'];

/**
 * @param stage     element he walks across
 * @param canWalk   () => bool, skip a lap while overlays are up
 * @param onClink   () => void, glass-clink sound
 * @param pickDrink () => drink {emoji, name}
 * @param getTarget () => {x, y}, where caught drinks fly to
 * @param onDrink   (drink) => void, called when a drink lands
 * @param onBusy    () => bool, true while the player is too blacked-out to catch anything
 */
export function startWaiter({ stage, canWalk = () => true, onClink, pickDrink, getTarget, onDrink, onBusy = () => false }) {
  const el = document.createElement('div');
  el.className = 'waiter';
  el.hidden = true;
  el.title = 'Free drinks! Click to snatch one.';
  el.innerHTML = `<div class="waiter-bubble"></div><div class="waiter-body">${WAITER_SVG}</div>`;
  stage.appendChild(el);
  const bubble = el.querySelector('.waiter-bubble');
  const trayGlasses = [...el.querySelectorAll('.w-d')];

  let anim = null;
  let passes = 0;
  let served = 0;
  let tray = 3;
  const timers = [];
  const later = (ms, fn) => timers.push(setTimeout(fn, ms));

  const say = (text) => {
    bubble.textContent = text;
    bubble.classList.remove('pop');
    void bubble.offsetWidth;
    bubble.classList.add('pop');
  };

  /** Take a glass off the tray and throw it to the player. */
  function hand() {
    if (!tray || onBusy()) return false;
    tray--;
    trayGlasses[tray]?.classList.add('gone');
    served++;
    const drink = pickDrink();
    const r = el.getBoundingClientRect();
    const facingRight = el.style.getPropertyValue('--face') !== '-1';
    const from = { x: r.left + r.width * (facingRight ? 0.8 : 0.2), y: r.top + r.height * 0.12 };
    throwDrink(drink, from, getTarget(), () => onDrink(drink));
    onClink?.();
    return true;
  }

  el.addEventListener('click', () => {
    if (!anim) return;
    if (hand()) say(pick(SNATCH_LINES));
    else say(tray ? pick(CLICK_LINES) : pick(EMPTY_LINES));
    anim.playbackRate = Math.min(4, anim.playbackRate * 1.6);
    el.classList.add('hurry');
  });

  function walk() {
    if (anim || document.hidden || !canWalk()) return;
    passes++;
    tray = 3;
    trayGlasses.forEach((g) => g.classList.remove('gone'));
    const mode = pickMode();
    const w = stage.clientWidth;
    const size = el.offsetWidth || 200;
    const ltr = Math.random() < 0.5;
    const start = ltr ? -size - 20 : w + 20;
    const end = ltr ? w + 20 : -size - 20;
    const facingRight = mode.moon ? !ltr : ltr;

    el.hidden = false;
    el.className = `waiter ${mode.cls}`;
    el.style.setProperty('--face', facingRight ? 1 : -1);
    say(passes % 5 === 0 ? `Lap ${passes}! Drinks served: ${served} (mostly stolen)` : mode.line());

    let frames;
    if (mode.stop) {
      // the fake-out: he stops right in front of you… and (usually) leaves
      const mid = w / 2 - size / 2;
      frames = [
        { transform: `translateX(${start}px)`, offset: 0 },
        { transform: `translateX(${mid}px)`, offset: 0.38 },
        { transform: `translateX(${mid}px)`, offset: 0.64 },
        { transform: `translateX(${end}px)`, offset: 1 },
      ];
      const generous = Math.random() < 0.5;
      later(mode.dur * 0.38, () => { el.classList.add('standing'); say('Can I get you anything? 🥂'); onClink?.(); });
      later(mode.dur * 0.5, () => say('…just kidding 😂'));
      if (generous) later(mode.dur * 0.58, () => hand() && say('…fine, here 🙄'));
      later(mode.dur * 0.64, () => el.classList.remove('standing'));
    } else {
      frames = [{ transform: `translateX(${start}px)` }, { transform: `translateX(${end}px)` }];
      // sometimes he just lobs one at you on the way past
      if (Math.random() < 0.35) later(mode.dur * 0.45, () => anim && hand() && say(pick(['Catch! 🍹', 'Heads up! 🍸', 'Think fast! 🥃'])));
      else if (mode.dur > 6000) later(mode.dur * 0.5, () => anim && say(pick(LINES)));
    }

    anim = el.animate(frames, { duration: mode.dur, easing: 'linear' });
    onClink?.();
    const done = () => {
      el.hidden = true;
      el.className = 'waiter';
      anim = null;
      timers.splice(0).forEach(clearTimeout);
    };
    anim.onfinish = done;
    anim.oncancel = done;
  }

  setTimeout(walk, 8000);
  setInterval(walk, 30000);
  return { walk };
}

/** An emoji drink flying end-over-end in an arc. */
function throwDrink(drink, a, b, onLand) {
  const el = document.createElement('span');
  el.className = 'fly-drink';
  el.textContent = drink.emoji;
  document.body.appendChild(el);
  const mid = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - 160 };
  const frames = [];
  for (let k = 0; k <= 12; k++) {
    const t = k / 12;
    const x = (1 - t) ** 2 * a.x + 2 * (1 - t) * t * mid.x + t * t * b.x;
    const y = (1 - t) ** 2 * a.y + 2 * (1 - t) * t * mid.y + t * t * b.y;
    frames.push({ transform: `translate(${x - 22}px, ${y - 22}px) rotate(${t * 540}deg) scale(${1 + Math.sin(Math.PI * t) * 0.6})` });
  }
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    el.remove();
    onLand();
  };
  el.animate(frames, { duration: 850, easing: 'cubic-bezier(0.3, 0, 0.3, 1)' }).onfinish = finish;
  setTimeout(finish, 1300);
}
