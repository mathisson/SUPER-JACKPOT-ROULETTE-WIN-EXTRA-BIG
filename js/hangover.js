// 🤕 THE HANGOVER: close the tab while drunk and the next visit starts the morning after.
// A too-bright hotel room, a phone full of Dave, and then a casino that is too bright and
// too loud for a while. Unless you pay $5 for water, obviously.

import { HangoverScene } from './hangover3d.js';

const AWAY_MS = 30_000; // how long you have to be gone for it to count as "the next morning"
const LEFT_DRUNK_AT = 3; // tipsy-meter units (Buzzed or worse)
const HANGOVER_S = 60;
const WATER = 5;

const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
const pick = (arr) => arr[(Math.random() * arr.length) | 0];

/**
 * @param dave      Dave remembers everything; his texts end up on the phone
 * @param setLoud   (on) => void, make every sound too loud
 */
export function createHangover({ store, sound, toast, booze, dave, getBalance, spend, pause3d, resume3d, setLoud }) {
  // remember how drunk you were when you walked away
  const noteExit = () => store.set('fr.leftDrunk', { bac: booze.bac(), drinks: booze.count(), t: Date.now() });
  addEventListener('pagehide', noteExit);
  document.addEventListener('visibilitychange', () => document.hidden && noteExit());

  const last = store.get('fr.leftDrunk', null);
  store.set('fr.leftDrunk', null);
  let pending = !!(last && last.bac >= LEFT_DRUNK_AT && Date.now() - last.t >= AWAY_MS);
  const waiters = [];
  const done = () => {
    pending = false;
    waiters.splice(0).forEach((fn) => fn());
  };

  let el = null;
  let scene = null;
  const onKey = (e) => {
    if (e.code === 'Space' || e.code === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  function wakeUp(info) {
    // your phone knows Dave, even if you don't (yet)
    let texts;
    if (!dave.met()) {
      dave.meet('hangover');
      texts = ["hey its dave from last night 🍺", 'u were AMAZING', 'u have my shoes'];
    } else {
      texts = dave.texts();
      if (texts.length < 2) texts = [...texts, 'u up? 🎰', 'last night was CRAZY'];
    }

    el = document.createElement('div');
    el.className = 'hangover';
    el.innerHTML = `<div class="k-stage"></div><div class="h-ui"></div>`;
    document.body.appendChild(el);
    document.body.classList.add('hangover-on');
    requestAnimationFrame(() => el.classList.add('on'));
    addEventListener('keydown', onKey, true);
    pause3d();
    scene = new HangoverScene(el.querySelector('.k-stage'), {
      texts,
      onBuzz: () => sound.blip(70, 0.35, 'square', 0.05),
    });

    const owed = dave.owed();
    setTimeout(() => {
      if (!el) return;
      el.querySelector('.h-ui').innerHTML = `
        <div class="h-card">
          <h2>☀️ Good morning.</h2>
          <p class="h-sub">It's 11:47 AM. You don't remember getting here.</p>
          <ul class="h-recap">
            <li>🍸 You had <b>${info.drinks || 'a lot of'}</b> drink${info.drinks === 1 ? '' : 's'}</li>
            <li>📱 <b>${texts.length}</b> unread texts from Dave</li>
            <li>💸 ${owed ? `Dave owes you <b>${money(owed)}</b>. Dave will never pay you back.` : 'Dave says you owe HIM money. You do not.'}</li>
            <li>🚧 There is a traffic cone in your bed</li>
          </ul>
          <button type="button" class="btn gold wide h-water">💧 Drink the ${money(WATER)} water <small>(cures it)</small></button>
          <button type="button" class="btn wide h-shades">😎 Sunglasses on, back to the casino</button>
        </div>`;
      el.querySelector('.h-water').addEventListener('click', () => {
        if (getBalance() < WATER) return toast("💧 You can't afford water. Classic.");
        spend(WATER);
        sound.blip(520, 0.2, 'sine', 0.12);
        toast(`💧 Hydrated. (-${money(WATER)}) The room stops spinning.`);
        close(false);
      });
      el.querySelector('.h-shades').addEventListener('click', () => {
        scene?.putOnShades();
        el.querySelector('.h-shades').disabled = true;
        setTimeout(() => close(true), 900);
      });
    }, 3200);
  }

  function close(hungover) {
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
      document.body.classList.remove('hangover-on');
      resume3d();
      if (hungover) startHangover();
      done();
    }, 500);
  }

  // ---------- back at the casino: too bright, too loud ----------
  let badge = null;
  let left = 0;
  let tick = null;
  function startHangover() {
    left = HANGOVER_S;
    document.body.classList.add('hungover');
    setLoud(true);
    badge = document.createElement('button');
    badge.type = 'button';
    badge.className = 'hangover-badge';
    badge.title = 'Everything is too bright and too loud. Water fixes it.';
    document.body.appendChild(badge);
    const render = () => (badge.innerHTML = `🤕 Hungover <b>${left}s</b> · 💧 ${money(WATER)}`);
    render();
    badge.addEventListener('click', () => {
      if (getBalance() < WATER) return toast("💧 You can't afford water. Classic.");
      spend(WATER);
      toast(`💧 Ahh. Much better. (-${money(WATER)})`);
      endHangover();
    });
    tick = setInterval(() => {
      if (--left <= 0) {
        toast(pick(['🤕 The headache is gone. Mostly.', '☀️ You can look at the lights again.']));
        endHangover();
      } else render();
    }, 1000);
    toast('😎 Everything is too bright and too loud for a minute.');
  }
  function endHangover() {
    clearInterval(tick);
    badge?.remove();
    badge = null;
    document.body.classList.remove('hungover');
    setLoud(false);
  }

  if (pending) setTimeout(() => wakeUp(last), 400);

  return {
    /** Run fn once the morning after is over (right away if there isn't one). */
    whenDone: (fn) => (pending ? waiters.push(fn) : fn()),
  };
}
