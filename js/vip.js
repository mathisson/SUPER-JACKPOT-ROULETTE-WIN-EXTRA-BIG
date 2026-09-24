// 🍾 VIP BOTTLE SERVICE: a proper nightclub drinks menu with proper nightclub prices.
// Cheap stuff gets thrown at you like the free drinks. Order a big enough bottle and the
// bottle girls parade it in, sparklers blazing, and dance to a song you pick on YouTube.

import { confetti } from './fx.js';
import { throwDrink } from './drinks.js';

// crew: how many bottle girls carry it in (0 = the bartender just lobs it at you)
export const MENU = [
  {
    title: '🍸 At the bar',
    items: [
      { id: 'lager', emoji: '🍺', name: 'Warm-ish Lager', desc: 'Poured at 4 pm. Served whenever.', price: 8, abv: 1 },
      { id: 'red', emoji: '🍷', name: 'House Red', desc: 'Vintage: last Tuesday.', price: 14, abv: 1 },
      { id: 'martini', emoji: '🍸', name: 'Dirty Martini', desc: 'Shaken, stirred, then dropped.', price: 18, abv: 1.5 },
      { id: 'tiki', emoji: '🍹', name: 'Tiki Punch', desc: 'The umbrella is the best part. Keep it.', price: 22, abv: 1.5 },
      { id: 'blue', emoji: '🧪', name: 'Mystery Blue Thing', desc: 'Not even the bartender knows.', price: 49, abv: 3 },
      { id: 'whiskey', emoji: '🥃', name: '25-Year Whiskey', desc: 'Aged 25 years. The ice, 25 minutes.', price: 120, abv: 2 },
    ],
  },
  {
    title: '🍾 Bottle service',
    items: [
      { id: 'pete', emoji: '🍾', name: "Bubbly Pete's Sparkling", desc: 'Champagne-shaped. Legally distinct.', price: 180, abv: 2 },
      { id: 'moet', emoji: '🍾', name: 'Moët & Chandelier', desc: 'Two bottle girls, two sparklers, one song of your choice.', price: 2500, abv: 3, crew: 2 },
      { id: 'dom', emoji: '🍾', name: 'Dom Pérignope', desc: 'Four bottle girls. The whole club turns around.', price: 10000, abv: 3, crew: 4 },
      { id: 'spudz', emoji: '🍾', name: 'Ace of Spudz GOLD 15L', desc: 'The entire crew, dressed how you like. Every sparkler we own.', price: 50000, abv: 4, crew: 6, gold: true },
    ],
  },
];
const ITEMS = MENU.flatMap((s) => s.items);

// Verified embeddable, with their tempo. Anything else: paste a link (and tap the beat).
const PRESETS = [
  { id: 'y6120QOlsfU', bpm: 136, title: 'Darude – Sandstorm' },
  { id: 'KQ6zr6kCPj8', bpm: 130, title: 'LMFAO – Party Rock Anthem' },
  { id: 'EPo5wWmKEaI', bpm: 129, title: 'Pitbull – Give Me Everything' },
  { id: '_ovdm2yX4MA', bpm: 126, title: 'Avicii – Levels' },
  { id: '9bZkp7q19f0', bpm: 132, title: 'PSY – Gangnam Style' },
  { id: 'z5LW07FTJbI', bpm: 140, title: 'Zombie Nation – Kernkraft 400' },
  { id: 'OPf0YbXqDm0', bpm: 115, title: 'Mark Ronson – Uptown Funk' },
  { id: '5NV6Rdv1a3I', bpm: 116, title: 'Daft Punk – Get Lucky' },
  { id: 'dQw4w9WgXcQ', bpm: 113, title: 'A very classy choice 🎩' },
];

// hostess looks: dress, dress shade, hair, skin, hairstyle
const LOOKS = [
  ['#ff2d9a', '#9b0f5b', '#1c120c', '#f1c27d', 'long'],
  ['#e0b45c', '#8a6420', '#f3d27a', '#ffdbac', 'pony'],
  ['#2de0ff', '#0b6c8f', '#3b2314', '#8d5524', 'bob'],
  ['#b066ff', '#5a1ea0', '#0c0c0c', '#c68642', 'long'],
  ['#ff5a3d', '#9c1f0c', '#7a2e12', '#e0ac69', 'pony'],
  ['#5ee08f', '#16804a', '#d9d9d9', '#f1c27d', 'bob'],
];

const money = (n) => '$' + n.toLocaleString('en-US');
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

/** Accepts watch/short/embed/music/youtu.be links (with ?t=) or a bare 11-char id. */
export function parseYouTube(input) {
  const s = String(input).trim();
  if (/^[\w-]{11}$/.test(s)) return { id: s, start: 0 };
  let u;
  try {
    u = new URL(/^https?:\/\//i.test(s) ? s : 'https://' + s);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www|m|music)\./, '');
  let id = null;
  if (host === 'youtu.be') id = u.pathname.slice(1, 12);
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com')
    id = u.searchParams.get('v') || (u.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/) || [])[1];
  if (!id || !/^[\w-]{11}$/.test(id)) return null;
  const t = (u.searchParams.get('t') || u.searchParams.get('start') || '').match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
  const start = t ? (+t[1] || 0) * 3600 + (+t[2] || 0) * 60 + (+t[3] || 0) : 0;
  return { id, start };
}

let ytPromise = null;
function loadYouTube() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  ytPromise ??= new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT);
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => {
      ytPromise = null;
      reject(new Error('YouTube failed to load'));
    };
    document.head.appendChild(s);
    setTimeout(() => reject(new Error('YouTube timed out')), 12000);
  });
  return ytPromise;
}

// What the crew wears for the gold bottle. The cheaper bottles always get the sequins.
export const OUTFITS = [
  { id: 'sequin', emoji: '🪩', name: 'Sequin Classic', desc: 'Sparkly mini dresses', price: 0 },
  { id: 'party', emoji: '👗', name: 'Satin Party Dress', desc: 'Silk, ruffles, made to twirl', price: 5000 },
  { id: 'bikini', emoji: '👙', name: 'Beach Club Bikini', desc: 'Pool party at the casino', price: 10000 },
];

function hostessSvg([dress, shade, hair, skin, style], uid, gold, outfit = 'sequin') {
  const d = `bgD${uid}`;
  const bikini = outfit === 'bikini';
  const hairBack = {
    long: `<path d="M43 56 Q40 104 48 118 L72 118 Q80 104 77 56 Z" fill="${hair}"/>`,
    pony: `<path class="bg-pony" d="M72 50 Q92 60 86 100 Q80 86 70 64 Z" fill="${hair}"/>`,
    bob: `<path d="M43 56 Q41 80 48 84 L72 84 Q79 80 77 56 Z" fill="${hair}"/>`,
  }[style];
  const bottle = gold ? '#e8c35a' : '#1f4d2c';
  const sparks = Array.from({ length: 9 }, (_, k) =>
    `<circle class="bg-sp" r="1.6" style="--a:${k * 40 + (k * 13) % 40}deg;animation-delay:-${((k * 0.137) % 0.6).toFixed(2)}s"/>`
  ).join('');
  // bikini legs start at the hip, dress legs start under the hem
  const legTop = bikini ? 146 : 176;
  const leg = (x, cls, shoe, tone) => `<g class="bg-leg ${cls}">
    <rect x="${x}" y="${legTop}" width="10" height="${238 - legTop}" rx="4.5" fill="${skin}"${tone ? ' filter="brightness(0.9)"' : ''}/>
    <path d="M${x - 2} 236 h15 l3 7 h-19 z" fill="${shoe}"/>
    <path d="M${x + 11} 236 l2 9" stroke="${shoe}" stroke-width="1.6"/>
  </g>`;

  const body = {
    sequin: `
      <path d="M47 86 Q60 80 73 86 L77 122 Q72 128 74 134 L90 186 Q60 196 30 186 L46 134 Q48 128 43 122 Z" fill="url(#${d})"/>
      <path d="M47 86 Q60 80 73 86 L77 122 Q72 128 74 134 L90 186 Q60 196 30 186 L46 134 Q48 128 43 122 Z" fill="url(#${d}s)"/>
      <path d="M44 128 Q60 134 76 128" stroke="rgba(255,255,255,0.35)" stroke-width="2" fill="none"/>`,
    party: `
      <g class="bg-skirt">
        <path d="M44 128 Q60 134 76 128 L98 176 Q90 185 82 178 Q72 189 60 182 Q48 189 38 178 Q30 185 22 176 Z" fill="${shade}"/>
        <path d="M45 128 Q60 133 75 128 L91 170 Q84 178 76 172 Q68 181 60 175 Q52 181 44 172 Q36 178 29 170 Z" fill="url(#${d})"/>
        <path d="M52 134 Q48 152 40 168 M68 134 Q72 152 80 168 M60 134 L60 172" stroke="rgba(255,255,255,0.22)" stroke-width="1.5" fill="none"/>
      </g>
      <path d="M45 90 Q53 83 70 80 L74 86 L76 122 Q70 127 72 131 L48 131 Q50 127 44 122 Z" fill="url(#${d})"/>
      <path d="M70 80 L66 72" stroke="url(#${d})" stroke-width="4" stroke-linecap="round"/>
      <path d="M50 92 Q54 104 50 120" stroke="rgba(255,255,255,0.4)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <rect x="45" y="122" width="31" height="7" rx="3" fill="${gold ? '#e8c35a' : '#1a1a1a'}"/>
      <circle cx="67" cy="125.5" r="3.4" fill="#fff" opacity="0.9"/><circle cx="67" cy="125.5" r="1.6" fill="${dress}"/>`,
    bikini: `
      <path d="M47 86 Q60 80 73 86 L75 118 Q71 128 76 142 L78 152 Q60 158 42 152 L44 142 Q49 128 45 118 Z" fill="${skin}"/>
      <path d="M58 127 q2 2 4 0" stroke="rgba(0,0,0,0.3)" stroke-width="1" fill="none"/>
      <path d="M51 94 L53 84 M69 94 L67 84" stroke="${shade}" stroke-width="1.4"/>
      <path d="M46 95 Q53 90 59.5 97 L60 104 Q53 108 46.5 104 Z" fill="url(#${d})"/>
      <path d="M74 95 Q67 90 60.5 97 L60 104 Q67 108 73.5 104 Z" fill="url(#${d})"/>
      <path d="M46 95 Q53 90 59.5 97 L60 104 Q53 108 46.5 104 Z M74 95 Q67 90 60.5 97 L60 104 Q67 108 73.5 104 Z" fill="url(#${d}s)"/>
      <path d="M44 143 Q60 147 76 143 L74.5 152 Q66 154 60 162 Q54 154 45.5 152 Z" fill="url(#${d})"/>
      <path d="M45 139 Q60 147 75 139" stroke="#ffe08a" stroke-width="1.3" stroke-dasharray="1.2 2.4" fill="none"/>
      <path class="bg-sarong" d="M73 143 Q86 172 82 208 L66 202 Q72 174 61 151 Z" fill="${dress}" opacity="0.55"/>`,
  }[outfit];

  const extras = bikini
    ? `<g transform="rotate(-6 60 44)"><ellipse cx="53" cy="43" rx="5.5" ry="3.6" fill="#111"/><ellipse cx="67" cy="43" rx="5.5" ry="3.6" fill="#111"/>
       <path d="M58.5 43 h3" stroke="#111" stroke-width="1.5"/><ellipse cx="51.5" cy="42" rx="1.8" ry="1" fill="rgba(255,255,255,0.5)"/></g>
       <g transform="translate(75 50)"><circle r="3" cx="0" cy="-3" fill="#ff5fa2"/><circle r="3" cx="3" cy="1" fill="#ff5fa2"/><circle r="3" cx="-3" cy="1" fill="#ff5fa2"/><circle r="1.8" fill="#ffe08a"/></g>`
    : outfit === 'party'
      ? `<path d="M45 64 v6 M75 64 v6" stroke="#ffe08a" stroke-width="1.4"/><circle cx="45" cy="71" r="1.9" fill="#fff"/><circle cx="75" cy="71" r="1.9" fill="#fff"/>
         <circle cx="44" cy="129" r="2.2" fill="#ffe08a"/>`
      : `<circle cx="45" cy="64" r="1.8" fill="#ffe08a"/><circle cx="75" cy="64" r="1.8" fill="#ffe08a"/>`;

  return `
<svg viewBox="0 -34 120 294" aria-hidden="true" class="o-${outfit}">
  <defs>
    <linearGradient id="${d}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${outfit === 'party' ? '#fff' : dress}" stop-opacity="${outfit === 'party' ? 0.55 : 1}"/>
      <stop offset="${outfit === 'party' ? 0.25 : 0}" stop-color="${dress}"/><stop offset="1" stop-color="${shade}"/>
    </linearGradient>
    <pattern id="${d}s" width="7" height="7" patternUnits="userSpaceOnUse">
      <circle class="bg-sequin" cx="3.5" cy="3.5" r="1.1" fill="rgba(255,255,255,0.6)"/>
    </pattern>
  </defs>
  ${hairBack}
  ${leg(61, 'bg-leg-b', '#111', true)}
  ${leg(49, 'bg-leg-a', gold ? '#b8862f' : '#0a0a0a', false)}
  <g class="bg-hips">${body}</g>
  <rect x="55" y="68" width="10" height="16" rx="4" fill="${skin}"/>
  <path class="bg-arm-l" d="M48 92 Q32 110 44 130" stroke="${skin}" stroke-width="7" fill="none" stroke-linecap="round"/>
  <g class="bg-arm-r">
    <path d="M72 92 Q90 72 86 42" stroke="${skin}" stroke-width="7" fill="none" stroke-linecap="round"/>
    <circle cx="86" cy="40" r="5" fill="${skin}"/>
    <g class="bg-bottle">
      <rect x="80" y="4" width="12" height="36" rx="3.5" fill="${bottle}" stroke="rgba(255,255,255,0.35)" stroke-width="0.8"/>
      <rect x="83.5" y="-8" width="5" height="14" rx="1.5" fill="${bottle}"/>
      <rect x="83" y="-9" width="6" height="5" rx="1" fill="#e0b45c"/>
      <rect x="81.5" y="16" width="9" height="12" rx="1.5" fill="${gold ? '#111' : '#f4efe4'}"/>
      <text x="86" y="25" font-size="6" text-anchor="middle" fill="${gold ? '#e8c35a' : '#1f4d2c'}" font-weight="900">♠</text>
      <g class="bg-spark" transform="translate(86 -12)">
        <line x1="0" y1="0" x2="0" y2="-10" stroke="#aaa" stroke-width="1"/>
        <g transform="translate(0 -10)" fill="#fff6c2">
          <circle class="bg-glow" r="5" fill="rgba(255,236,150,0.55)"/>
          ${sparks}
        </g>
      </g>
    </g>
  </g>
  <circle cx="60" cy="58" r="15" fill="${skin}"/>
  <path d="M44 58 Q44 40 60 40 Q76 40 76 58 Q72 48 62 47 Q56 52 46 54 Z" fill="${hair}"/>
  <path d="M53 58 q2.5 -2.5 5 0 M62 58 q2.5 -2.5 5 0" stroke="#1a1a1a" stroke-width="1.6" fill="none" stroke-linecap="round"/>
  <path d="M55 65 Q60 69.5 65 65" stroke="#b3123f" stroke-width="2" fill="none" stroke-linecap="round"/>
  <circle cx="51" cy="63" r="2.6" fill="rgba(255,110,140,0.4)"/><circle cx="69" cy="63" r="2.6" fill="rgba(255,110,140,0.4)"/>
  ${extras}
</svg>`;
}

// Dave. Nobody invited Dave. Tie round his head, beer in hand, dancing to a different song.
function dudeSvg() {
  return `
<svg viewBox="0 -34 120 294" aria-hidden="true">
  <g class="dd-leg dd-leg-b"><rect x="60" y="148" width="12" height="88" rx="4" fill="#2d3340"/><path d="M58 234 h19 q3 0 3 5 v2 h-22 z" fill="#5a3418"/></g>
  <g class="dd-leg dd-leg-a"><rect x="47" y="148" width="12" height="88" rx="4" fill="#353c4a"/><path d="M45 234 h19 q3 0 3 5 v2 h-22 z" fill="#4a2a12"/></g>
  <g class="dd-body">
    <path d="M42 86 Q60 79 78 86 L82 150 Q74 158 66 152 Q58 160 50 153 Q44 158 38 150 Z" fill="#dce8f6"/>
    <path d="M60 84 L55 94 L60 102 L65 94 Z" fill="#f1c27d"/>
    <path d="M60 84 L52 90 L56 98 Z M60 84 L68 90 L64 98 Z" fill="#c5d6ea"/>
    <ellipse cx="47" cy="110" rx="5" ry="7" fill="rgba(150,170,200,0.45)"/><ellipse cx="73" cy="112" rx="5" ry="7" fill="rgba(150,170,200,0.45)"/>
    <circle cx="61" cy="112" r="1.3" fill="#9aa"/><circle cx="62" cy="126" r="1.3" fill="#9aa"/>
    <path d="M40 146 L50 152 L44 158 Z" fill="#dce8f6"/>
  </g>
  <g class="dd-arm-l">
    <path d="M45 92 Q28 90 26 66" stroke="#dce8f6" stroke-width="9" fill="none" stroke-linecap="round"/>
    <circle cx="26" cy="63" r="5" fill="#f1c27d"/>
    <g transform="translate(18 40)"><rect x="0" y="0" width="13" height="20" rx="2" fill="rgba(255,190,60,0.9)" stroke="#fff" stroke-width="1"/>
      <path d="M-1 1 q3 -6 7 -2 q3 -5 8 1 v2 h-15 z" fill="#fff"/><path d="M13 5 q6 0 6 6 q0 5 -6 5" stroke="#fff" stroke-width="1.6" fill="none"/></g>
  </g>
  <g class="dd-arm-r">
    <path d="M75 92 Q94 96 100 76" stroke="#dce8f6" stroke-width="9" fill="none" stroke-linecap="round"/>
    <circle cx="101" cy="72" r="5" fill="#f1c27d"/>
  </g>
  <g class="dd-head">
    <circle cx="60" cy="58" r="16" fill="#f1c27d"/>
    <path d="M44 52 L47 38 L52 46 L55 34 L60 44 L64 33 L67 45 L73 37 L75 52 Q60 44 44 52 Z" fill="#6b4423"/>
    <path d="M43 50 Q60 44 77 50 L77 55 Q60 49 43 55 Z" fill="#c0182a"/>
    <path d="M76 51 q10 2 13 12 M76 53 q7 6 6 15" stroke="#c0182a" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M51 60 h7 M63 60 h7" stroke="#222" stroke-width="2" stroke-linecap="round"/>
    <path d="M51 58 q3.5 -2 7 0 M63 58 q3.5 -2 7 0" stroke="#222" stroke-width="1" fill="none"/>
    <circle cx="60" cy="64" r="3" fill="#e0706a"/>
    <path d="M52 68 Q60 78 69 67 Q60 71 52 68 Z" fill="#7a1d1d"/><path d="M54 68.5 Q60 70.5 67 68" stroke="#fff" stroke-width="1.4"/>
    <circle cx="50" cy="65" r="3.4" fill="rgba(255,90,90,0.5)"/><circle cx="71" cy="65" r="3.4" fill="rgba(255,90,90,0.5)"/>
    <path class="dd-sweat" d="M77 58 q3 5 0 7 q-3 -2 0 -7 z" fill="#8fd3ff"/>
  </g>
</svg>`;
}

/**
 * @param sound     the shared sound object (blip, clink, cash, muted)
 * @param music     lobby music (stop/start/playing)
 * @param musicOn   () => bool, whether the player wants lobby music at all
 * @param booze     the bar (add, target, blackedOut)
 * @param getBalance / spend  wallet
 * @param onBroke   () => void, nudge the player towards the fake cashier
 */
export function createVip({ button, sound, music, musicOn, toast, booze, getBalance, spend, onBroke }) {
  // A paper menu: slides up closed, the leather cover swings open onto two parchment pages.
  // The cover's inside face *is* the left page (the bar), the right page is bottle service.
  const itemHtml = (it, n) => `<button type="button" class="vip-item${it.gold ? ' gold' : ''}" data-id="${it.id}" style="--n:${n}">
      <span class="vi-emoji">${it.emoji}</span>
      <span class="vi-text">
        <span class="vi-line"><b>${it.name}</b><i class="vi-dots"></i><span class="vi-price">${money(it.price)}</span></span>
        <small>${it.desc}</small>
      </span>
      ${it.crew ? `<span class="vi-crew" title="${it.crew} bottle girls + your song">💃×${it.crew} + 🎵</span>` : ''}
    </button>`;
  const sectionHtml = (sec, cls) => `<section class="pm-sec ${cls}">
      <h3 class="pm-h3"><span>${sec.title}</span></h3>
      <div class="vip-items">${sec.items.map(itemHtml).join('')}</div>
    </section>`;

  const modal = document.createElement('dialog');
  modal.className = 'modal vip-menu';
  modal.innerHTML = `
    <div class="pm">
      <div class="pm-book">
        <div class="pm-page pm-right">
          ${sectionHtml(MENU[1], 'pm-bottles')}
          <p class="pm-foot">Bottles of 2,500+ arrive with bottle girls, sparklers &amp; a song of your choice.<br>Play money only. Drink water in real life. 💧</p>
        </div>
        <div class="pm-cover">
          <div class="pm-face pm-front">
            <div class="pm-crest">
              <div class="pm-suits">♠ ♥ ♣ ♦</div>
              <div class="pm-club">Club<br>Jackpot</div>
              <div class="pm-rule"></div>
              <div class="pm-kind">Drinks &amp; Bottle Service</div>
              <div class="pm-est">est. last Tuesday</div>
            </div>
            <div class="pm-tap">tap to open</div>
          </div>
          <div class="pm-face pm-back pm-page pm-left">
            <h2 class="pm-title">Carte des Boissons</h2>
            <p class="pm-sub">The waiter's drinks are free. These are not.<br>Prices include a mandatory vibe charge.</p>
            ${sectionHtml(MENU[0], 'pm-bar')}
          </div>
        </div>
        <i class="pm-ribbon"></i>
      </div>
      <div class="pm-slip vip-song" aria-hidden="true">
        <div class="pm-clip"></div>
        <button type="button" class="linkbtn vip-back">← back to the menu</button>
        <div class="pm-slip-head">DJ Request</div>
        <div class="vip-order"></div>
        <div class="pm-outfits" hidden>
          <h3 class="pm-slip-h">Dress the crew</h3>
          <div class="pm-outfit-row">
            ${OUTFITS.map(
              (o, k) => `<button type="button" class="pm-outfit" data-outfit="${o.id}">
                <span class="pmo-fig">${hostessSvg(LOOKS[(k * 2) % LOOKS.length], 'o' + k, true, o.id)}</span>
                <b>${o.emoji} ${o.name}</b><small>${o.desc}</small><em>${o.price ? '+' + money(o.price) : 'included'}</em>
              </button>`
            ).join('')}
          </div>
        </div>
        <h3 class="pm-slip-h">Which song do they dance to?</h3>
        <div class="vip-presets">
          ${PRESETS.map((p) => `<button type="button" class="vip-preset" data-yt="${p.id}">${p.title}</button>`).join('')}
          <button type="button" class="vip-preset" data-yt="">🎹 Keep the lobby music</button>
        </div>
        <label class="vip-url">…or write in any YouTube link
          <input type="url" placeholder="https://youtu.be/…" autocomplete="off" spellcheck="false">
        </label>
        <p class="vip-song-status" role="status"></p>
        <a class="linkbtn vip-search" href="https://www.youtube.com/results?search_query=club+banger" target="_blank" rel="noopener">🔎 Find one on YouTube ↗</a>
        <button type="button" class="btn gold wide vip-pop"></button>
      </div>
      <button class="pm-close" type="button" aria-label="Close menu">×</button>
    </div>`;
  document.body.appendChild(modal);
  const $ = (sel) => modal.querySelector(sel);
  const pm = $('.pm');
  const urlInput = $('.vip-url input');
  const status = $('.vip-song-status');
  const barSec = $('.pm-bar');
  const narrow = matchMedia('(max-width: 700px)');

  let order = null; // the item waiting for a song
  let song = null; // { id, start, title, bpm } or null for lobby music
  let outfit = 'sequin'; // only the gold bottle gets to choose
  const extra = () => (order?.gold ? OUTFITS.find((o) => o.id === outfit).price : 0);
  let party = null;
  let openTimer, closeTimer;

  /** Fold the cover shut, slide the menu away, then really close the dialog. */
  function close(fast = false) {
    if (!modal.open || pm.classList.contains('closing')) return;
    clearTimeout(openTimer);
    pm.classList.remove('slip-on');
    pm.classList.add('closing');
    pm.classList.toggle('fast', fast);
    pm.classList.remove('open');
    sound.blip(260, 0.08, 'triangle', 0.08);
    closeTimer = setTimeout(() => {
      modal.close();
      pm.classList.remove('closing');
    }, fast ? 380 : 900);
  }
  $('.pm-close').addEventListener('click', () => close());
  modal.addEventListener('cancel', (e) => {
    e.preventDefault();
    pm.classList.contains('slip-on') ? showSlip(false) : close();
  });
  modal.addEventListener('click', (e) => e.target === modal && close());
  $('.pm-front').addEventListener('click', () => openCover());

  function openCover() {
    clearTimeout(openTimer);
    if (pm.classList.contains('open')) return;
    pm.classList.add('open');
    sound.blip(180, 0.18, 'triangle', 0.06);
    sound.blip(330, 0.12, 'sine', 0.05, 0.12);
  }

  function showSlip(on) {
    pm.classList.toggle('slip-on', on);
    $('.pm-slip').setAttribute('aria-hidden', String(!on));
    modal.querySelectorAll('.pm-book button').forEach((b) => (b.tabIndex = on ? -1 : 0));
    sound.blip(on ? 900 : 600, 0.05, 'triangle', 0.08);
  }

  function refresh() {
    const bal = getBalance();
    modal.querySelectorAll('.vip-item').forEach((b) => {
      const it = ITEMS.find((x) => x.id === b.dataset.id);
      b.classList.toggle('pricey', it.price > bal);
    });
  }

  button.addEventListener('click', () => {
    if (party) return toast('The party is still going! 🎉');
    if (modal.open) return;
    clearTimeout(closeTimer);
    // phones get one page: the bar moves onto the right page, above the bottles
    const single = narrow.matches;
    pm.classList.toggle('single', single);
    if (single) $('.pm-right').prepend(barSec);
    else $('.pm-left').append(barSec);
    pm.classList.remove('open', 'closing', 'slip-on');
    showSlip(false);
    refresh();
    modal.showModal();
    $('.pm-front').focus?.();
    sound.clink();
    openTimer = setTimeout(openCover, 650);
  });

  function canAfford(it, plus = 0) {
    if (booze.blackedOut()) {
      toast("You're asleep in the parking lot. The bar is closed to you. 💤");
      return false;
    }
    if (it.price + plus > getBalance()) {
      toast(pick([
        `Declined. That's ${money(it.price + plus)} and you have ${money(getBalance())}.`,
        'The bouncer looked at your balance and laughed. 🕴️',
        'Card declined. Your fake card needs more fake money.',
      ]));
      onBroke?.();
      return false;
    }
    return true;
  }

  modal.querySelector('.pm-book').addEventListener('click', (e) => {
    const b = e.target.closest('.vip-item');
    if (!b) return;
    const it = ITEMS.find((x) => x.id === b.dataset.id);
    if (!canAfford(it)) return;
    if (!it.crew) return serve(it);
    order = it;
    $('.vip-order').innerHTML = `<span>${it.emoji}</span><b>${it.name}</b><em>${money(it.price)}</em>`;
    loadYouTube().catch(() => {}); // warm it up while they choose
    $('.pm-outfits').hidden = !it.gold;
    pickOutfit('sequin');
    chooseSong(song);
    showSlip(true);
  });

  function chooseSong(s) {
    song = s;
    modal.querySelectorAll('.vip-preset').forEach((b) =>
      b.classList.toggle('on', s ? b.dataset.yt === s.id : b.dataset.yt === '')
    );
    status.classList.remove('bad');
    status.textContent = s ? `🎧 Now queued: ${s.title}` : '🎹 The lobby music it is. Classy.';
    popLabel();
  }
  const popLabel = () => ($('.vip-pop').textContent = `🍾 Pop it! ${money((order?.price || 0) + extra())}`);
  function pickOutfit(id) {
    outfit = id;
    modal.querySelectorAll('.pm-outfit').forEach((b) => b.classList.toggle('on', b.dataset.outfit === id));
    popLabel();
  }
  $('.pm-outfit-row').addEventListener('click', (e) => {
    const b = e.target.closest('.pm-outfit');
    if (!b) return;
    pickOutfit(b.dataset.outfit);
    sound.blip(1200, 0.04, 'triangle', 0.08);
  });

  $('.vip-back').addEventListener('click', () => showSlip(false));
  $('.vip-presets').addEventListener('click', (e) => {
    const b = e.target.closest('.vip-preset');
    if (!b) return;
    urlInput.value = '';
    const pre = PRESETS.find((x) => x.id === b.dataset.yt);
    chooseSong(pre ? { id: pre.id, start: 0, title: pre.title, bpm: pre.bpm } : null);
  });
  urlInput.addEventListener('input', () => {
    if (!urlInput.value.trim()) return chooseSong(null);
    const yt = parseYouTube(urlInput.value);
    if (!yt) {
      status.textContent = "🤔 That doesn't look like a YouTube link";
      status.classList.add('bad');
      return;
    }
    chooseSong({ ...yt, title: 'your pick' });
    modal.querySelectorAll('.vip-preset').forEach((b) => b.classList.remove('on'));
  });

  $('.vip-pop').addEventListener('click', () => {
    if (!order || !canAfford(order, extra())) return;
    if (urlInput.value.trim() && !parseYouTube(urlInput.value)) return urlInput.focus();
    const it = order;
    const cost = it.price + extra();
    order = null;
    spend(cost);
    close(true);
    sound.cash();
    startParty(it, song, it.gold ? outfit : 'sequin');
  });

  /** Small stuff: pay, then the bartender throws it at your glass stack. */
  function serve(it) {
    spend(it.price);
    sound.clink();
    close(true);
    const r = button.getBoundingClientRect();
    throwDrink(it, { x: r.left + r.width / 2, y: r.bottom }, booze.target(), () => booze.add(it));
  }

  // ---------- the party ----------
  function startParty(it, pickSong, outfitId = 'sequin') {
    const outfit = OUTFITS.find((o) => o.id === outfitId) || OUTFITS[0];
    const el = document.createElement('div');
    el.className = `vip-party${it.gold ? ' gold' : ''}`;
    el.innerHTML = `
      <div class="vp-dim"></div>
      <div class="vp-lights"><i></i><i></i><i></i><i></i></div>
      <div class="vp-ball">🪩</div>
      <div class="vp-banner">
        <div class="vp-kicker">🍾 BOTTLE SERVICE 🍾</div>
        <div class="vp-name">${it.name}</div>
        <div class="vp-price">${money(it.price + (it.gold ? outfit.price : 0))} · for the high roller at table 7${outfit.price ? ` · ${outfit.emoji} ${outfit.name}` : ''}</div>
      </div>
      <div class="vp-floor"></div>
      <div class="vp-crew"></div>
      <div class="vp-dj">
        <div class="vp-dj-head">🎧 <span class="vp-now">${pickSong ? 'Loading your song…' : '🎹 Lobby music'}</span></div>
        <div class="vp-video"><div></div></div>
        <p class="vp-tap" hidden>Tap ▶ on the video if the music doesn't start</p>
        <button type="button" class="btn vp-beat" title="Tap along with the music (or press T) to lock the dancers to the beat">🥁 Tap the beat <b></b></button>
        <div class="vp-dj-btns">
          <button type="button" class="btn vp-hide">🙈 Back to the table</button>
          <button type="button" class="btn spin vp-end">🛑 End party</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    document.body.classList.add('vip-party-on');
    if (!pickSong) el.querySelector('.vp-video').remove();

    const crewEl = el.querySelector('.vp-crew');
    const girls = Array.from({ length: it.crew }, (_, i) => {
      const g = document.createElement('div');
      g.className = `bgirl walking move-${'abc'[i % 3]}${i % 2 ? ' mirror' : ''}`;
      g.style.setProperty('--i', i);
      g.innerHTML = `<div class="bg-spin">${hostessSvg(LOOKS[i % LOOKS.length], 'g' + i, it.gold, it.gold ? outfit.id : 'sequin')}</div>`;
      crewEl.appendChild(g);
      return g;
    });

    const timers = [];
    const later = (ms, fn) => timers.push(setTimeout(fn, ms));
    const lobbyWasOn = music.playing;
    let player = null;
    let ended = false;

    party = { end };
    later(30, () => el.classList.add('on'));
    sound.blip(1400, 0.05, 'square', 0.18);
    sound.blip(700, 0.12, 'triangle', 0.12, 0.05);

    // walk in from the right, one by one, and spread out across the floor
    const w = crewEl.clientWidth;
    const size = girls[0].offsetWidth || 120;
    const slotX = (i) => (w * (i + 1)) / (it.crew + 1) - size / 2;
    const WALK = 3400;
    const STAGGER = 420;
    girls.forEach((g, i) => {
      g.animate(
        [{ transform: `translateX(${w + 40 + i * 30}px)` }, { transform: `translateX(${slotX(i)}px)` }],
        { duration: WALK + i * 120, delay: i * STAGGER, easing: 'cubic-bezier(0.25, 0.6, 0.35, 1)', fill: 'both' }
      );
    });
    const arrived = WALK + (it.crew - 1) * (STAGGER + 120);
    later(arrived, () => {
      girls.forEach((g) => g.classList.replace('walking', 'dancing'));
      el.classList.add('arrived');
      const r = crewEl.getBoundingClientRect();
      confetti(innerWidth / 2, r.top + r.height * 0.2, it.gold ? 260 : 150, it.gold ? 1.5 : 1.2);
      sound.clink();
      beatHint();
    });
    if (it.gold) for (let k = 1; k <= 4; k++) later(arrived + k * 4500, () => confetti(Math.random() * innerWidth, innerHeight * 0.3, 90, 1.1));

    // ---- beat sync: every dance move runs on one clock, locked to the song ----
    // The clock is the YouTube playhead (or the lobby band's own bar clock); the tempo
    // starts from the preset's BPM and gets corrected by tapping along.
    let bpm = pickSong ? pickSong.bpm || 124 : music.song === 'slots' ? 126 : 132;
    let offset = pickSong ? 0 : music.nextBar || 0; // song time of some beat "one"
    let synced = !pickSong; // the lobby band tells us exactly where its bars start
    const yt = { t: 0, at: performance.now(), playing: false };
    const clock = () => {
      if (!pickSong || !player) return music.ctx?.currentTime ?? performance.now() / 1000;
      return yt.playing ? yt.t + (performance.now() - yt.at) / 1000 : yt.t;
    };
    const beatEl = el.querySelector('.vp-beat b');
    const showBpm = () => (beatEl.textContent = `${Math.round(bpm)} BPM${synced ? ' · locked 🔒' : ''}`);
    function beatHint() {
      if (!synced) toast('🥁 Tap the beat (or press T) to lock the dancers to your song');
    }
    showBpm();

    const DANCE = new Set(['bgBottle', 'bgBounce', 'bgHips', 'bgTwirl', 'bgKnee', 'bgSway', 'bgWave', 'bgShuffle', 'bgStep', 'bgSkirt', 'bgPony', 'bgFlare']);
    const mod = (a, n) => ((a % n) + n) % n;
    function syncDance() {
      if (pickSong && player?.getCurrentTime) {
        const t = player.getCurrentTime();
        if (t !== yt.t) Object.assign(yt, { t, at: performance.now() });
        yt.playing = player.getPlayerState?.() === 1;
      }
      const running = !pickSong || !player || yt.playing;
      el.classList.toggle('hold', !running && el.classList.contains('arrived'));
      const beatS = 60 / bpm;
      el.style.setProperty('--beat', beatS.toFixed(4) + 's');
      const target = (clock() - offset) * 1000;
      for (const a of crewEl.getAnimations({ subtree: true })) {
        if (!a.animationName || !DANCE.has(a.animationName)) continue;
        const who = a.effect.target.closest('.bgirl');
        if (!who || who.classList.contains('walking') || who.classList.contains('dude')) continue;
        const tm = a.effect.getComputedTiming();
        const period = tm.duration * (String(tm.direction).startsWith('alternate') ? 2 : 1);
        if (!period) continue;
        const want = mod(target, period);
        const drift = mod(a.currentTime - want, period);
        if (Math.min(drift, period - drift) > 35) a.currentTime = want + period * 50;
      }
    }
    const syncTimer = setInterval(syncDance, 120);

    // tap tempo: 3+ taps set the BPM, and the taps themselves say where the beat is
    let taps = [];
    function tapBeat() {
      const t = clock();
      if (taps.length && t - taps[taps.length - 1] > 2) taps = [];
      taps.push(t);
      taps = taps.slice(-8);
      el.querySelectorAll('.bg-glow').forEach((g) => g.animate([{ transform: 'scale(2.4)', opacity: 1 }, { transform: 'scale(1)' }], 200));
      sound.blip(taps.length > 2 ? 1500 : 1000, 0.03, 'square', 0.06);
      if (taps.length < 3) return;
      let period = (taps[taps.length - 1] - taps[0]) / (taps.length - 1);
      while (60 / period > 180) period *= 2;
      while (60 / period < 70) period /= 2;
      bpm = 60 / period;
      offset = taps.reduce((s, x, i) => s + (x - i * period), 0) / taps.length;
      synced = true;
      showBpm();
      syncDance();
    }
    el.querySelector('.vp-beat').addEventListener('click', tapBeat);

    // ---- Dave: sometimes a very drunk guy joins in. More likely the drunker *you* are. ----
    let dave = null;
    if (Math.random() < Math.min(0.75, 0.35 + booze.level() * 0.1)) later(arrived + 3500 + Math.random() * 5000, daveCrashes);
    function daveCrashes() {
      if (ended) return;
      dave = document.createElement('div');
      dave.className = 'bgirl dude walking';
      dave.title = 'Nobody invited Dave';
      dave.innerHTML = `<div class="dude-bubble"></div><div class="bg-spin">${dudeSvg()}</div>`;
      crewEl.appendChild(dave);
      const spot = slotX(Math.floor(Math.random() * it.crew)) + (Math.random() < 0.5 ? -1 : 1) * size * 0.5;
      const from = -size - 30;
      // three steps forward, one step back, a little lurch
      dave.animate(
        [
          { transform: `translateX(${from}px) rotate(0)` },
          { transform: `translateX(${from + (spot - from) * 0.45}px) rotate(8deg)`, offset: 0.35 },
          { transform: `translateX(${from + (spot - from) * 0.3}px) rotate(-10deg)`, offset: 0.5 },
          { transform: `translateX(${from + (spot - from) * 0.8}px) rotate(12deg)`, offset: 0.8 },
          { transform: `translateX(${spot}px) rotate(0)` },
        ],
        { duration: 4200, easing: 'ease-in-out', fill: 'both' }
      );
      say(pick(['WOOOOOO! 🍺', 'Ladies!! 🕺', 'Is this the VIP?? I\'m VIP now']));
      sound.blip(220, 0.25, 'sawtooth', 0.05);
      later(4200, () => {
        if (!dave) return;
        dave.classList.replace('walking', 'dancing');
        daveLoop();
      });
      dave.addEventListener('click', () => dave?.classList.contains('dancing') && stumble("I'm fine!! I'm FINE 🙃"));
    }
    const DAVE_LINES = [
      'I love you guys!!', '*hic*', 'Is this the Macarena?', 'Watch this move!', 'My wife thinks I\'m at a conference',
      'Who ordered this?? ME! 🍾', 'One more song!!', 'Guys. GUYS. I\'m the high roller now', 'Where are my shoes',
    ];
    function say(text) {
      const b = dave?.querySelector('.dude-bubble');
      if (!b) return;
      b.textContent = text;
      b.classList.remove('pop');
      void b.offsetWidth;
      b.classList.add('pop');
      clearTimeout(b._t);
      b._t = setTimeout(() => b.classList.remove('pop'), 2600);
    }
    function stumble(line) {
      if (!dave || dave.classList.contains('fall')) return;
      say(line);
      dave.classList.add('fall');
      sound.boom?.(0.25);
      later(1700, () => dave?.classList.remove('fall'));
    }
    function daveLoop() {
      if (ended || !dave) return;
      const line = pick(DAVE_LINES);
      if (line === 'Watch this move!') {
        say(line);
        later(1300, () => stumble('…I meant to do that'));
      } else say(line);
      later(5000 + Math.random() * 4000, daveLoop);
    }

    // music: the club gets quiet, your song gets loud
    if (pickSong) {
      if (lobbyWasOn) music.stop();
      loadYouTube()
        .then((YT) => {
          if (ended) return;
          player = new YT.Player(el.querySelector('.vp-video div'), {
            host: 'https://www.youtube-nocookie.com',
            videoId: pickSong.id,
            playerVars: { autoplay: 1, start: pickSong.start || 0, playsinline: 1, rel: 0, modestbranding: 1 },
            events: {
              onReady: (e) => {
                if (sound.muted) e.target.mute();
                e.target.setVolume(85);
                e.target.playVideo();
                later(4000, () => player?.getPlayerState?.() !== 1 && (el.querySelector('.vp-tap').hidden = false));
              },
              onStateChange: (e) => {
                if (e.data === YT.PlayerState.PLAYING) {
                  el.querySelector('.vp-tap').hidden = true;
                  const title = e.target.getVideoData?.().title;
                  if (title) el.querySelector('.vp-now').textContent = title;
                }
                if (e.data === YT.PlayerState.ENDED) end();
              },
              onError: () => fallback("That video won't play here (the uploader blocked embedding). DJ's choice!"),
            },
          });
        })
        .catch(() => fallback("Couldn't reach YouTube. The DJ brought a USB stick."));
    } else {
      later(26000, end);
    }

    function fallback(msg) {
      if (ended) return;
      toast(`🎧 ${msg}`);
      el.querySelector('.vp-video')?.remove();
      el.querySelector('.vp-tap').hidden = true;
      el.querySelector('.vp-now').textContent = '🎹 Lobby music';
      try {
        player?.destroy();
      } catch {}
      player = null;
      pickSong = null; // dance to the band instead
      if (musicOn() && !music.playing) music.start();
      bpm = music.song === 'slots' ? 126 : 132;
      offset = music.nextBar || 0;
      synced = true;
      showBpm();
      later(20000, end);
    }

    // keep the video in step with the 🔊 button
    const muteSync = setInterval(() => {
      if (!player?.isMuted) return;
      if (sound.muted && !player.isMuted()) player.mute();
      else if (!sound.muted && player.isMuted()) player.unMute();
    }, 500);

    const hideBtn = el.querySelector('.vp-hide');
    hideBtn.addEventListener('click', () => {
      const mini = el.classList.toggle('mini');
      document.body.classList.toggle('vip-party-on', !mini);
      hideBtn.textContent = mini ? '💃 Bring them back' : '🙈 Back to the table';
    });
    el.querySelector('.vp-end').addEventListener('click', () => end());

    const onKey = (e) => {
      if (el.classList.contains('mini') || e.repeat) return;
      if (e.code === 'KeyT') return tapBeat();
      if (e.code === 'Escape') end();
      if (e.code === 'Space' || e.code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    addEventListener('keydown', onKey, true);

    function end() {
      if (ended) return;
      ended = true;
      removeEventListener('keydown', onKey, true);
      clearInterval(muteSync);
      clearInterval(syncTimer);
      timers.splice(0).forEach(clearTimeout);
      try {
        player?.destroy();
      } catch {}
      player = null;
      el.classList.remove('mini', 'hold');
      el.classList.add('leaving');
      document.body.classList.add('vip-party-on');

      // the lead girl hands you the bottle on her way out
      const lead = girls[Math.floor(girls.length / 2)].getBoundingClientRect();
      throwDrink({ emoji: '🍾' }, { x: lead.left + lead.width * 0.7, y: lead.top + lead.height * 0.1 }, booze.target(), () =>
        booze.add({ emoji: '🍾', name: it.name, abv: it.abv })
      );

      const x0 = (g) => new DOMMatrix(getComputedStyle(g).transform).m41;
      const walkers = dave ? [...girls, dave] : girls;
      if (dave) say(pick(['Wait for meee!', 'Best. Night. Ever.', 'Can I get a ride?']));
      walkers.forEach((g, i) => {
        const from = x0(g);
        g.getAnimations().forEach((a) => a.cancel());
        g.classList.remove('dancing', 'fall');
        g.classList.add('walking');
        g.animate([{ transform: `translateX(${from}px)` }, { transform: `translateX(${-size - 60 - i * 20}px)` }], {
          duration: g === dave ? 3200 : 2600,
          delay: i * 160,
          easing: 'ease-in',
          fill: 'both',
        });
      });
      const gone = 2600 + walkers.length * 160 + (dave ? 800 : 0);
      setTimeout(() => el.classList.remove('on'), gone - 800);
      setTimeout(() => {
        el.remove();
        document.body.classList.remove('vip-party-on');
        party = null;
        if (musicOn() && !music.playing) music.start();
        toast(dave ? 'Dave has been escorted home. What a night. 🚕' : pick(['What a night. 🥂', 'The bottle girls say goodnight 💋', 'Legend. Absolute legend. 👑']));
      }, gone + 200);
    }
  }

  return { isPartying: () => !!party && !document.querySelector('.vip-party.mini'), refresh };
}
