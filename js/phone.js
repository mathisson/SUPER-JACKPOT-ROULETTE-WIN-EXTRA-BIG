// 📱 YOUR PHONE: Messages (Dave, who has feelings), a cab home, food delivery and a selfie
// camera. The handset is 3D (phone3d.js); this file is the phone's apps.

import { PhoneOverlay, SelfieCam, SCREEN_PX } from './phone3d.js';
import { REPLIES } from './dave.js';
import { throwDrink } from './drinks.js';

const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

const CAB = { base: 10, surge: 4.8 };
const FOOD = [
  { id: 'kebab', emoji: '🥙', name: 'Kebab', desc: 'Sobers you up a bit. Mostly garlic.', price: 15, sober: 2 },
  { id: 'pizza', emoji: '🍕', name: 'Pizza Slice', desc: 'One slice. Cold. Perfect.', price: 8, sober: 1 },
  { id: 'wrap', emoji: '🌯', name: 'Mystery Wrap', desc: 'Could be anything. Could be vodka.', price: 4, sober: 'mystery' },
];
const ETA_S = 8;
const MAX_PHOTOS = 6;

const moodLabel = (m) => (m >= 40 ? '🥰 loves you' : m >= 10 ? '🙂 in a good mood' : m > -25 ? '😐 normal Dave' : m > -45 ? '😒 annoyed' : '😤 FURIOUS');
const clock = () => new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

/**
 * @param canOpen       () => bool, nothing else is taking over the screen
 * @param roomVisible   () => bool, the roulette room is showing (the courier walks in there)
 * @param bannersOn     () => bool, show Dave's text banners (a setting)
 */
export function createPhone({ button, store, sound, toast, booze, dave, hangover, settings, courier, getBalance, spend, pause3d, resume3d, canOpen, roomVisible, bannersOn = () => true }) {
  let layer = null;
  let overlay = null;
  let screen = null;
  let view = 'home';
  let selfie = null;
  let typing = false;
  let chips = null;
  let cab = 'idle';
  let order = null; // { item, left }
  let photos = store.get('fr.selfies', []);
  let viewing = null;

  // ---------- the button in the top bar ----------
  const badge = () => {
    const n = dave.unread();
    button.querySelector('.ph-badge').textContent = n > 9 ? '9+' : n;
    button.classList.toggle('has-unread', n > 0);
  };
  badge();
  button.addEventListener('click', () => (layer ? close() : open()));
  addEventListener('keydown', (e) => {
    if (e.code !== 'KeyP' || e.repeat || /INPUT|TEXTAREA/.test(document.activeElement?.tagName)) return;
    if (layer) close();
    else open();
  });

  // ---------- open / close ----------
  function open(app = 'home') {
    if (layer) return show(app);
    if (!canOpen()) return toast('📱 Not now, you have your hands full.');
    layer = document.createElement('div');
    layer.className = 'phone-layer';
    layer.innerHTML = `<div class="ph-dim"></div><div class="ph-stage"></div>`;
    document.body.appendChild(layer);
    document.body.classList.add('phone-on');
    screen = document.createElement('div');
    screen.className = 'ph-screen';
    screen.style.width = SCREEN_PX.w + 'px';
    screen.style.height = SCREEN_PX.h + 'px';
    screen.innerHTML = `
      <div class="ph-status"><span class="ph-time">${clock()}</span><span class="ph-island"></span><span class="ph-icons">📶 🔋</span></div>
      <div class="ph-view"></div>
      <button type="button" class="ph-homebar" aria-label="Home"></button>`;
    screen.addEventListener('click', onClick);
    layer.querySelector('.ph-dim').addEventListener('click', close);
    pause3d();
    overlay = new PhoneOverlay(layer.querySelector('.ph-stage'), screen);
    overlay.open();
    addEventListener('keydown', onKey, true);
    requestAnimationFrame(() => layer?.classList.add('on'));
    show(app);
    sound.blip(1200, 0.04, 'triangle', 0.07);
    sound.blip(1600, 0.05, 'triangle', 0.06, 0.05);
  }

  function close() {
    if (!layer) return;
    const dying = layer;
    const o = overlay;
    stopCamera();
    layer = null;
    overlay = null;
    screen = null;
    removeEventListener('keydown', onKey, true);
    dying.classList.remove('on');
    o.close(() => {
      o.dispose();
      dying.remove();
      document.body.classList.remove('phone-on');
      resume3d();
    });
    sound.blip(900, 0.04, 'triangle', 0.06);
    badge();
  }

  const onKey = (e) => {
    if (e.code === 'Escape') {
      viewing ? ((viewing = null), render()) : view !== 'home' ? show('home') : close();
    }
    if (e.code === 'Space' || e.code === 'Escape') {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  function show(app) {
    if (view === 'camera' && app !== 'camera') stopCamera();
    view = app;
    viewing = null;
    if (app === 'messages') {
      chips = null;
      dave.markRead();
    }
    render();
    if (app === 'camera') startCamera();
    badge();
  }

  // ---------- screens ----------
  function render() {
    if (!screen) return;
    screen.querySelector('.ph-time').textContent = clock();
    const v = screen.querySelector('.ph-view');
    v.className = `ph-view v-${view}`;
    v.innerHTML = { home: homeHtml, messages: messagesHtml, cab: cabHtml, food: foodHtml, camera: cameraHtml }[view]();
    if (view === 'messages') {
      const list = v.querySelector('.msg-list');
      if (list) list.scrollTop = list.scrollHeight;
    }
  }

  function homeHtml() {
    const n = dave.unread();
    const app = (id, emoji, label, extra = '') => `<button type="button" class="ph-app" data-app="${id}"><span class="ph-icon i-${id}">${emoji}${extra}</span><small>${label}</small></button>`;
    return `
      <div class="ph-home">
        <div class="ph-clock">${clock()}</div>
        <div class="ph-date">${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        <div class="ph-grid">
          ${app('messages', '💬', 'Messages', n ? `<b class="ph-dot">${n}</b>` : '')}
          ${app('cab', '🚕', 'CabCab')}
          ${app('food', '🛵', 'GrubGrab')}
          ${app('camera', '📸', 'Camera')}
        </div>
        <p class="ph-tip">Press <kbd>P</kbd> to put your phone away</p>
      </div>`;
  }

  const header = (title, sub = '') => `<div class="ph-head"><button type="button" class="ph-back" data-app="home">‹</button><div><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</div></div>`;

  function messagesHtml() {
    if (!dave.met()) {
      return `${header('Messages')}<div class="msg-empty">No messages yet.<br><small>You don't know anyone called Dave. Yet.</small></div>`;
    }
    chips ??= [pick(REPLIES.nice), pick(REPLIES.weird), pick(REPLIES.mean)]
      .map((m, i) => ({ kind: ['nice', 'weird', 'mean'][i], m }))
      .sort(() => Math.random() - 0.5);
    const wantsSorry = dave.wantsSorry();
    const thread = dave.thread();
    const bubbles = thread
      .map((x, i) => {
        const prev = thread[i - 1];
        const stamp = !prev || x.t - prev.t > 5 * 60000 ? `<div class="msg-stamp">${new Date(x.t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>` : '';
        return `${stamp}<div class="msg ${x.from === 'me' ? 'me' : 'them'}">${esc(x.m)}</div>`;
      })
      .join('');
    const last = thread[thread.length - 1];
    const seen = last?.from === 'me' ? '<div class="msg-seen">Delivered</div>' : '';
    return `
      ${header('Dave 🍺', typing ? 'typing…' : moodLabel(dave.mood()))}
      <div class="msg-list">${bubbles}${seen}${typing ? '<div class="msg them typing"><i></i><i></i><i></i></div>' : ''}</div>
      <div class="msg-chips">
        ${wantsSorry ? `<button type="button" class="msg-chip sorry" data-reply="sorry" data-m="${esc(REPLIES.sorry[0])}">${esc(REPLIES.sorry[0])}</button>` : ''}
        ${chips.map((c) => `<button type="button" class="msg-chip ${c.kind}" data-reply="${c.kind}" data-m="${esc(c.m)}">${esc(c.m)}</button>`).join('')}
      </div>`;
  }

  function cabHtml() {
    const fare = CAB.base * CAB.surge;
    const body = {
      idle: `
        <div class="cab-card">
          <div class="cab-row"><span>📍 From</span><b>Club Jackpot, table 7</b></div>
          <div class="cab-row"><span>🏠 To</span><b>Home</b></div>
          <div class="cab-row"><span>💸 Fare</span><b>${money(CAB.base)} × <span class="surge">${CAB.surge}× surge</span> = ${money(fare)}</b></div>
          <button type="button" class="btn gold wide" data-cab="book">🚕 Request ride · ${money(fare)}</button>
          <p class="cab-fine">Surge pricing is in effect because it is always in effect.</p>
        </div>`,
      coming: `<div class="cab-card"><div class="cab-car">🚕</div><b>Kevin (4.9★) is on his way</b><p>Silver Prius · smells like pine</p><div class="cab-bar"><i></i></div></div>`,
    }[cab];
    return `${header('CabCab')}<div class="cab-map"><i class="road h1"></i><i class="road h2"></i><i class="road v1"></i><i class="road v2"></i><span class="pin you">🎰</span><span class="pin home">🏠</span>${cab === 'coming' ? '<span class="pin car">🚕</span>' : ''}</div>${body}`;
  }

  function foodHtml() {
    if (order) {
      return `${header('GrubGrab')}<div class="food-track"><div class="food-big">🛵</div><b>Marco is bringing your ${order.item.emoji} ${order.item.name}</b><p>${order.left > 0 ? `Arriving in ${order.left}s` : 'At your table!'}</p><div class="cab-bar"><i style="width:${(1 - order.left / ETA_S) * 100}%"></i></div><p class="cab-fine">Put your phone away to watch him walk in.</p></div>`;
    }
    return `${header('GrubGrab', 'delivers to casino tables, sadly')}<div class="food-list">${FOOD.map(
      (f) => `<div class="food-item"><span class="food-emoji">${f.emoji}</span><div><b>${f.name}</b><small>${f.desc}</small></div><button type="button" class="btn gold" data-food="${f.id}">${money(f.price)}</button></div>`
    ).join('')}</div>`;
  }

  function cameraHtml() {
    if (viewing != null) {
      return `${header('Photo')}<div class="cam-view"><img src="${photos[viewing]}" alt="Selfie"></div><button type="button" class="btn wide" data-photo-close>Back to camera</button>`;
    }
    return `
      ${header('Camera', 'selfie mode 🤳')}
      <div class="cam-finder"><canvas class="cam-canvas"></canvas><div class="cam-flash"></div></div>
      <div class="cam-controls">
        <button type="button" class="cam-look" data-settings title="Change your look">👕</button>
        <button type="button" class="cam-shutter" data-shoot aria-label="Take selfie"></button>
        <span class="cam-count">${photos.length}/${MAX_PHOTOS}</span>
      </div>
      <div class="cam-roll">${photos.map((p, i) => `<button type="button" data-photo="${i}"><img src="${p}" alt=""></button>`).reverse().join('') || '<small>No selfies yet. Be brave.</small>'}</div>`;
  }

  // ---------- the selfie camera ----------
  function startCamera() {
    const canvas = screen?.querySelector('.cam-canvas');
    if (!canvas) return;
    stopCamera();
    selfie = new SelfieCam(canvas, { look: settings.look(), drunk: booze.level(), dave: dave.met() && (dave.here() || Math.random() < 0.4) });
  }
  function stopCamera() {
    selfie?.dispose();
    selfie = null;
  }
  settings.onChange((look) => selfie?.setLook(look));

  function shoot() {
    if (!selfie) return;
    const f = screen.querySelector('.cam-flash');
    f.classList.remove('go');
    void f.offsetWidth;
    f.classList.add('go');
    sound.blip(2400, 0.03, 'square', 0.08);
    sound.blip(900, 0.08, 'triangle', 0.07, 0.04);
    const url = selfie.snap({ caption: `Club Jackpot · ${money(getBalance())} 💸` });
    photos = [...photos, url].slice(-MAX_PHOTOS);
    try {
      store.set('fr.selfies', photos);
    } catch {}
    render();
    startCamera();
  }

  // ---------- the cab home ----------
  function bookCab() {
    const fare = CAB.base * CAB.surge;
    if (getBalance() < fare) return toast(`💳 Declined. The ride is ${money(fare)}. You have ${money(getBalance())}. Walking it is.`);
    spend(fare);
    cab = 'coming';
    render();
    sound.blip(660, 0.1, 'triangle', 0.08);
    setTimeout(() => {
      cab = 'idle';
      const drinks = booze.count();
      const drunk = booze.bac() >= 3;
      close();
      setTimeout(() => {
        if (drunk) {
          booze.sober(99);
          hangover.wakeUpNow({ drinks, fare }, 'cab');
        } else {
          toast(`🚕 Kevin drove you round the block and dropped you back at the casino. "You looked lost." (-${money(fare)})`);
        }
      }, 700);
    }, 3200);
  }

  // ---------- food ----------
  function orderFood(item) {
    if (order) return toast('🛵 One order at a time. Marco has one scooter.');
    if (getBalance() < item.price) return toast(`💳 Declined. Even the ${money(item.price)} ${item.name}.`);
    spend(item.price);
    order = { item, left: ETA_S };
    sound.cash();
    render();
    const tick = setInterval(() => {
      order.left--;
      if (view === 'food') render();
      if (order.left > 0) return;
      clearInterval(tick);
      if (layer) close();
      setTimeout(() => arrive(item), 600);
    }, 1000);
  }

  function arrive(item) {
    const finish = () => (order = null);
    const eat = (from) => {
      const target = booze.target();
      throwDrink({ emoji: item.emoji }, from, target, () => {
        if (item.sober === 'mystery') {
          if (Math.random() < 0.35) {
            booze.add({ emoji: '🌯', name: 'Mystery Wrap (it was vodka)', abv: 1.5 });
          } else {
            booze.sober(3);
            toast('🌯 The Mystery Wrap was… great? You feel much better. Don\'t ask.');
          }
        } else {
          booze.sober(item.sober);
          toast(`${item.emoji} ${item.name} delivered! You feel ${item.sober > 1 ? 'a lot' : 'a bit'} less drunk.`);
        }
        finish();
      });
    };
    // no roulette room on screen (you're at the slots)? He just hands it over.
    if (!roomVisible() || !courier.deliver({ foodName: item.name.toLowerCase(), onArrive: eat, onStolen: () => {
      toast(`🍺 Dave ate your ${item.name}. Marco shrugs and leaves. No refunds.`);
      finish();
    } })) {
      eat({ x: innerWidth / 2, y: 120 });
    }
  }

  // ---------- taps ----------
  function onClick(e) {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.classList.contains('ph-homebar')) return show('home');
    if (t.dataset.app) return show(t.dataset.app);
    if (t.dataset.reply) {
      if (typing) return;
      dave.reply(t.dataset.reply, t.dataset.m);
      chips = null;
      sound.blip(1500, 0.03, 'sine', 0.06);
      return render();
    }
    if (t.dataset.cab === 'book') return bookCab();
    if (t.dataset.food) return orderFood(FOOD.find((f) => f.id === t.dataset.food));
    if (t.dataset.shoot != null) return shoot();
    if (t.dataset.photo != null) {
      viewing = +t.dataset.photo;
      stopCamera();
      return render();
    }
    if (t.dataset.photoClose != null) {
      viewing = null;
      render();
      return startCamera();
    }
    if (t.dataset.settings != null) {
      close();
      setTimeout(() => settings.open('character'), 450);
    }
  }

  // ---------- Dave talks to the phone ----------
  dave.on((type, data) => {
    if (type === 'typing') typing = data;
    if (type === 'message' || type === 'read') badge();
    if (layer && view === 'messages') {
      if (type === 'message') dave.markRead();
      render();
    }
  });
  dave.setHooks({
    openPhone: (app) => open(app),
    closePhone: close,
    isReading: () => (!!layer && view === 'messages') || !bannersOn(),
    phonePoint: () => {
      const r = button.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    },
    onText: () => {
      button.classList.remove('buzz');
      void button.offsetWidth;
      button.classList.add('buzz');
      overlay?.vibrate();
      badge();
    },
  });

  return { open, close, isOpen: () => !!layer };
}
