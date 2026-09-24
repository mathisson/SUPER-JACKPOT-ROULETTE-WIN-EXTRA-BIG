// ⚙️ SETTINGS, top-right corner: your 3D character on a turntable, a character editor,
// a store for hats and bling, and the actual settings (sound, music, Dave, motion).

import { AvatarStage, BASE, CATALOG, SLOTS, DEFAULT_LOOK, portrait } from './avatar.js';

const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
const byId = (id) => CATALOG.find((c) => c.id === id);

/**
 * @param button    the top-right button (gets your portrait)
 * @param prefs     [{ id, label, desc, get: () => bool, set: (bool) => void }]
 * @param pause3d / resume3d  only one 3D room renders at a time
 */
export function createSettings({ button, store, sound, toast, getBalance, spend, prefs, pause3d, resume3d }) {
  let look = { ...DEFAULT_LOOK, ...store.get('fr.look', {}) };
  let owned = new Set(store.get('fr.owned', ['tshirt']));
  owned.add('tshirt');
  const save = () => {
    store.set('fr.look', look);
    store.set('fr.owned', [...owned]);
  };
  const listeners = [];

  function refreshButton() {
    try {
      button.querySelector('img').src = portrait(look);
    } catch {
      // no WebGL for portraits: the gear alone will do
    }
  }
  refreshButton();

  let el = null;
  let stage = null;
  let tab = 'character';
  let trying = null; // a store item you're trying on (not bought)
  let storeSlot = 'all';

  const onKey = (e) => {
    if (e.code === 'Escape') close();
    if (e.code === 'Space' || e.code === 'Escape') {
      e.stopPropagation();
      if (e.target.tagName !== 'BUTTON') e.preventDefault();
    }
  };

  function open(which = 'character') {
    if (el) return;
    tab = which;
    el = document.createElement('div');
    el.className = 'settings';
    el.innerHTML = `
      <div class="st-stage"></div>
      <div class="st-hint">Drag to spin 👆</div>
      <aside class="st-panel">
        <div class="st-head"><h2>⚙️ Settings</h2><button type="button" class="st-close" aria-label="Close">×</button></div>
        <div class="st-tabs" role="tablist">
          <button type="button" data-tab="character">👤 Character</button>
          <button type="button" data-tab="store">🛍️ Store</button>
          <button type="button" data-tab="settings">⚙️ Settings</button>
        </div>
        <div class="st-body"></div>
        <div class="st-foot">Balance <b class="st-bal"></b></div>
      </aside>`;
    document.body.appendChild(el);
    document.body.classList.add('settings-on');
    requestAnimationFrame(() => el?.classList.add('on'));
    addEventListener('keydown', onKey, true);
    pause3d();
    stage = new AvatarStage(el.querySelector('.st-stage'), look);
    el.querySelector('.st-close').addEventListener('click', close);
    el.querySelector('.st-tabs').addEventListener('click', (e) => {
      const b = e.target.closest('[data-tab]');
      if (b) show(b.dataset.tab);
    });
    el.querySelector('.st-body').addEventListener('click', onBodyClick);
    el.querySelector('.st-body').addEventListener('change', onToggle);
    show(tab);
    sound.blip(880, 0.05, 'triangle', 0.08);
  }

  function close() {
    if (!el) return;
    const dying = el;
    const s = stage;
    el = null;
    stage = null;
    trying = null;
    dying.classList.remove('on');
    removeEventListener('keydown', onKey, true);
    setTimeout(() => {
      s?.dispose();
      dying.remove();
      document.body.classList.remove('settings-on');
      resume3d();
    }, 350);
    refreshButton();
  }

  function preview() {
    stage?.setLook(trying ? { ...look, [trying.slot]: trying.id } : look);
  }

  function setLook(patch) {
    look = { ...look, ...patch };
    save();
    preview();
    listeners.forEach((fn) => fn(look));
    sound.blip(1200, 0.04, 'triangle', 0.07);
  }

  // ---------- tabs ----------
  function show(which) {
    if (!el) return;
    if (tab === 'store' && which !== 'store' && trying) {
      trying = null;
      preview();
    }
    tab = which;
    el.querySelectorAll('.st-tabs [data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === which));
    el.querySelector('.st-bal').textContent = money(getBalance());
    const body = el.querySelector('.st-body');
    body.innerHTML = which === 'store' ? storeHtml() : which === 'settings' ? prefsHtml() : characterHtml();
    body.scrollTop = 0;
  }

  const swatches = (key, colors) =>
    `<div class="st-swatches">${colors
      .map((c) => `<button type="button" class="st-sw${look[key] === c ? ' on' : ''}" data-set="${key}" data-val="${c}" style="--c:${c}" aria-label="${c}"></button>`)
      .join('')}</div>`;
  const chips = (key, opts) =>
    `<div class="st-chips">${opts
      .map(([v, label]) => `<button type="button" class="st-chip${look[key] === v ? ' on' : ''}" data-set="${key}" data-val="${v}">${label}</button>`)
      .join('')}</div>`;

  function characterHtml() {
    const slotRow = ([slot, label]) => {
      const mine = CATALOG.filter((c) => c.slot === slot && owned.has(c.id));
      const none = slot === 'top' ? '' : `<button type="button" class="st-chip${!look[slot] ? ' on' : ''}" data-set="${slot}" data-val="">None</button>`;
      return `<h4>${label}</h4><div class="st-chips">${none}${mine
        .map((c) => `<button type="button" class="st-chip${look[slot] === c.id ? ' on' : ''}" data-set="${slot}" data-val="${c.id}">${c.emoji} ${c.name}</button>`)
        .join('')}${mine.length < CATALOG.filter((c) => c.slot === slot).length ? `<button type="button" class="st-chip st-more" data-goto="store" data-slot="${slot}">🛍️ More…</button>` : ''}</div>`;
    };
    return `
      <h4>Skin</h4>${swatches('skin', BASE.skin)}
      <h4>Hair</h4>${chips('hair', BASE.hair)}
      <h4>Hair colour</h4>${swatches('hairColor', BASE.hairColor)}
      <h4>Facial hair</h4>${chips('facial', BASE.facial)}
      <h4>Expression</h4>${chips('face', BASE.face)}
      <h4>Build</h4>${chips('build', BASE.build)}
      <h4>T-shirt colour ${!['tshirt', 'tank'].includes(look.top) ? '<small>(wear the T-shirt or tank top to see it)</small>' : ''}</h4>${swatches('shirt', BASE.shirt)}
      <h4>Pants colour ${['tux', 'goldsuit', 'sequin', 'tracksuit', 'bathrobe'].includes(look.top) ? '<small>(this outfit comes with its own)</small>' : ''}</h4>${swatches('pants', BASE.pants)}
      <h4>Shoes ${['tux', 'bathrobe'].includes(look.top) ? '<small>(this outfit comes with its own)</small>' : ''}</h4>${swatches('shoes', BASE.shoes)}
      <div class="st-sep">Your stuff</div>
      ${SLOTS.map(slotRow).join('')}`;
  }

  function storeHtml() {
    const bal = getBalance();
    const items = CATALOG.filter((c) => c.price > 0 && (storeSlot === 'all' || c.slot === storeSlot));
    const filters = [['all', '✨ All'], ...SLOTS];
    return `
      <p class="st-note">Spend your winnings on things that matter. Try anything on for free.</p>
      <div class="st-chips st-filters">${filters
        .map(([v, label]) => `<button type="button" class="st-chip${storeSlot === v ? ' on' : ''}" data-filter="${v}">${label}</button>`)
        .join('')}</div>
      <div class="st-store">${items
        .map((c) => {
          const has = owned.has(c.id);
          const worn = look[c.slot] === c.id;
          const onTry = trying?.id === c.id;
          const btn = has
            ? `<button type="button" class="btn st-equip${worn ? ' worn' : ''}" data-equip="${c.id}">${worn ? '✓ Equipped' : 'Equip'}</button>`
            : `<button type="button" class="btn gold st-buy${bal < c.price ? ' broke' : ''}" data-buy="${c.id}">Buy ${money(c.price)}</button>`;
          return `<div class="st-item${onTry ? ' trying' : ''}${has ? ' owned' : ''}">
            <button type="button" class="st-try" data-try="${c.id}" title="Try it on">
              <span class="st-emoji">${c.emoji}</span>
              <b>${c.name}</b>
              ${c.note ? `<small>${c.note}</small>` : ''}
              <em>${onTry ? '👀 Trying on' : has ? 'Owned' : 'Tap to try on'}</em>
            </button>
            ${btn}
          </div>`;
        })
        .join('')}</div>`;
  }

  function prefsHtml() {
    return `<div class="st-prefs">${prefs
      .map(
        (p) => `<label class="st-pref">
          <span><b>${p.label}</b><small>${p.desc}</small></span>
          <input type="checkbox" data-pref="${p.id}" ${p.get() ? 'checked' : ''}><i class="st-switch"></i>
        </label>`
      )
      .join('')}</div>
      <p class="st-note">Your character and everything you've bought are saved in this browser.</p>`;
  }

  // ---------- clicks ----------
  function onBodyClick(e) {
    const t = e.target.closest('button');
    if (!t) return;
    if (t.dataset.set) {
      setLook({ [t.dataset.set]: t.dataset.val || null });
      show(tab);
    } else if (t.dataset.goto) {
      storeSlot = t.dataset.slot || 'all';
      show('store');
    } else if (t.dataset.filter) {
      storeSlot = t.dataset.filter;
      show('store');
    } else if (t.dataset.try) {
      const item = byId(t.dataset.try);
      trying = trying?.id === item.id ? null : item;
      preview();
      sound.blip(trying ? 1000 : 700, 0.05, 'triangle', 0.07);
      show('store');
    } else if (t.dataset.equip) {
      const item = byId(t.dataset.equip);
      trying = null;
      setLook({ [item.slot]: look[item.slot] === item.id && item.slot !== 'top' ? null : item.id });
      show('store');
    } else if (t.dataset.buy) {
      const item = byId(t.dataset.buy);
      if (getBalance() < item.price) {
        sound.blip(160, 0.2, 'sawtooth', 0.1);
        return toast(`💳 ${item.name} costs ${money(item.price)}. You have ${money(getBalance())}. The store laughs politely.`);
      }
      spend(item.price);
      owned.add(item.id);
      trying = null;
      sound.cash();
      setLook({ [item.slot]: item.id });
      toast(`🛍️ ${item.emoji} ${item.name} bought and equipped! (-${money(item.price)})`);
      show('store');
    }
  }

  function onToggle(e) {
    const id = e.target.dataset.pref;
    if (!id) return;
    prefs.find((p) => p.id === id)?.set(e.target.checked);
    sound.blip(e.target.checked ? 1000 : 600, 0.05, 'triangle', 0.08);
  }

  button.addEventListener('click', () => (el ? close() : open()));

  return {
    open,
    close,
    isOpen: () => !!el,
    look: () => look,
    /** fn(look) whenever your character changes */
    onChange: (fn) => listeners.push(fn),
  };
}
