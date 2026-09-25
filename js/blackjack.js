// 🃏 BLACKJACK: a room of its own, dealt by a very smug dealer.
// Six decks, blackjack pays 3 to 2, the dealer stands on all 17s, double on any two cards,
// split once, insurance when the dealer shows an ace.

import { BlackjackTable, SPOTS } from './blackjack3d.js';
import { celebrate, winLevel } from './fx.js';
import { emit } from './events.js';

const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
const pick = (a) => a[(Math.random() * a.length) | 0];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const DECKS = 6;
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
const SUITS = ['S', 'H', 'D', 'C'];
const CHIPS = [5, 25, 100, 500, 1000];

// ---------- the rules ----------
const rankValue = (r) => (r === 'A' ? 11 : 'JQK'.includes(r) || r === '10' ? 10 : +r);
export function handValue(cards) {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    total += rankValue(c.rank);
    if (c.rank === 'A') aces++;
  }
  while (total > 21 && aces) {
    total -= 10;
    aces--;
  }
  return { total, soft: aces > 0 };
}
const isBlackjack = (cards) => cards.length === 2 && handValue(cards).total === 21;

function newShoe() {
  const shoe = [];
  for (let d = 0; d < DECKS; d++) for (const suit of SUITS) for (const rank of RANKS) shoe.push({ rank, suit });
  for (let i = shoe.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shoe[i], shoe[j]] = [shoe[j], shoe[i]];
  }
  return shoe;
}

// ---------- the dealer's mouth ----------
const QUIPS = {
  welcome: ['Welcome. Try not to cry on the felt.', "Ah, fresh money. I mean, a fresh face.", 'Sit, sit. The house has missed you.'],
  deal: ['Cards are coming.', 'Good luck. You will need it.', "Let's see how this goes wrong."],
  hit: ['Bold.', 'Another? Sure.', 'Living dangerously.', "If you say so."],
  stand: ['Standing on that? Brave.', 'Interesting choice.', "Fine. My turn."],
  double: ['Feeling brave?', 'Double or nothing. Mostly nothing.', 'Ooh, a high roller.'],
  split: ['Two hands, twice the disappointment.', "Splitting. How ambitious.", 'Now you can lose in stereo.'],
  insurance: ['Insurance? Against what, exactly?', 'Would you like to insure your insurance?'],
  bust: ['Oof. So close to twenty-one, and yet.', 'Bust. Happens to the best. Mostly to you.', 'Twenty-two is not a lucky number.', 'The cards have spoken.'],
  playerBJ: ['Blackjack. Beginner\'s luck, obviously.', 'Hmph. Enjoy it while it lasts.', "I'll allow it."],
  dealerBJ: ['Would you look at that. Blackjack.', 'Natural. Like my talent.', 'The house always wins. Well, mostly.'],
  dealerBust: ['...The cards are sticky today.', "That's never happened before. Ever.", 'I let you have that one.'],
  win: ['Fine. Take your chips.', 'Enjoy it. It won\'t last.', 'Congratulations, I suppose.'],
  lose: ['Better luck next time. There is always a next time.', 'Thank you for your donation.', 'The house thanks you.'],
  push: ['Nobody wins. My favourite.', 'A tie. How thrilling.', 'Push. Your money lives to lose another day.'],
  shuffle: ['Fresh shoe. Everybody look away.', 'Shuffling. No, I am not counting. Are you?'],
};

/**
 * @param onOpen / onClose   only one 3D room renders at a time
 * @param onRound({ net, staked, multiple })  a round is over (XP, challenges, the loyalty card)
 */
export function createBlackjack({ sound, toast, getBalance, adjust, onOpen, onClose, onRound }) {
  let el = null;
  let table = null;
  let shoe = newShoe();
  let phase = 'bet'; // bet | deal | insurance | play | dealer
  let bet = 0;
  let lastBet = 25;
  let hands = []; // { cards, entries, bet, done, doubled, fromSplit }
  let active = 0;
  let dealer = { cards: [], entries: [], hole: null };
  let insurance = 0;
  let bubbleUntil = 0;

  const $ = (s) => el.querySelector(s);

  function say(kind, extra = '') {
    if (!el) return;
    const b = $('.bj-bubble');
    b.textContent = extra || pick(QUIPS[kind]);
    b.classList.add('on');
    bubbleUntil = performance.now() + 2800;
  }

  function banner(text, cls = '') {
    const b = $('.bj-banner');
    b.className = `bj-banner on ${cls}`;
    b.textContent = text;
    clearTimeout(banner.t);
    banner.t = setTimeout(() => b.classList.remove('on'), 1900);
  }

  const cardSnap = () => {
    sound.blip(2600, 0.02, 'square', 0.04);
    sound.blip(900, 0.03, 'triangle', 0.05, 0.01);
  };

  function draw() {
    if (shoe.length < 15) shoe = newShoe();
    return shoe.pop();
  }

  // ---------- rendering the HTML chrome ----------
  function render() {
    if (!el) return;
    $('.bj-bal').textContent = money(getBalance());
    $('.bj-bet').textContent = money(phase === 'bet' ? bet : hands.reduce((a, h) => a + h.bet, 0));
    $('.bj-back').disabled = phase !== 'bet';
    const acts = $('.bj-actions');
    const chipsEl = $('.bj-chips');
    chipsEl.hidden = phase !== 'bet';
    if (phase === 'bet') {
      acts.innerHTML = `
        <button type="button" class="btn" data-act="clear" ${bet ? '' : 'disabled'}>Clear</button>
        <button type="button" class="btn" data-act="rebet" ${lastBet && lastBet <= getBalance() ? '' : 'disabled'}>Rebet ${money(lastBet)}</button>
        <button type="button" class="btn gold bj-deal" data-act="deal" ${bet ? '' : 'disabled'}>DEAL</button>`;
    } else if (phase === 'insurance') {
      acts.innerHTML = `<span class="bj-q">Insurance for ${money(Math.floor(hands[0].bet / 2))}?</span>
        <button type="button" class="btn" data-act="insNo">No thanks</button>
        <button type="button" class="btn gold" data-act="insYes" ${getBalance() >= Math.floor(hands[0].bet / 2) ? '' : 'disabled'}>Insure</button>`;
    } else if (phase === 'play') {
      const h = hands[active];
      const canDouble = h.cards.length === 2 && getBalance() >= h.bet;
      const canSplit = hands.length === 1 && h.cards.length === 2 && rankValue(h.cards[0].rank) === rankValue(h.cards[1].rank) && getBalance() >= h.bet;
      acts.innerHTML = `
        <button type="button" class="btn bj-hit" data-act="hit" title="H">Hit</button>
        <button type="button" class="btn bj-stand" data-act="stand" title="S">Stand</button>
        <button type="button" class="btn" data-act="double" title="D" ${canDouble ? '' : 'disabled'}>Double</button>
        <button type="button" class="btn" data-act="split" title="P" ${canSplit ? '' : 'disabled'}>Split</button>`;
    } else {
      acts.innerHTML = '<span class="bj-q">…</span>';
    }
    renderLabels();
  }

  function totalText(cards, hideHole, fromSplit = false) {
    if (!cards.length) return '';
    const shown = hideHole ? cards.filter((c) => c !== dealer.hole) : cards;
    if (!hideHole && !fromSplit && isBlackjack(cards)) return 'BLACKJACK'; // after a split, it's just 21
    const v = handValue(shown);
    if (v.total > 21) return 'BUST';
    return v.soft && v.total < 21 && !hideHole ? `${v.total - 10} / ${v.total}` : String(v.total);
  }

  function renderLabels() {
    const labels = $('.bj-labels');
    const items = [];
    if (dealer.cards.length) items.push({ key: 'dealer', text: totalText(dealer.cards, !!dealer.hole), at: SPOTS.dealer(Math.max(0, dealer.cards.length - 1) / 2) });
    hands.forEach((h, i) => {
      if (!h.cards.length) return;
      const mid = SPOTS.hand(i, hands.length, (h.cards.length - 1) / 2);
      items.push({ key: 'h' + i, text: totalText(h.cards, false, h.fromSplit) + (h.doubled ? ' ×2' : ''), at: mid, on: phase === 'play' && i === active && hands.length > 1 });
    });
    labels.innerHTML = items.map((it) => `<span class="bj-total${it.on ? ' on' : ''}${it.text === 'BUST' ? ' bust' : it.text === 'BLACKJACK' ? ' bj' : ''}" data-k="${it.key}">${it.text}</span>`).join('');
    labels._items = items;
    placeLabels();
  }

  function placeLabels() {
    if (!el || !table) return;
    const labels = $('.bj-labels');
    (labels._items || []).forEach((it) => {
      const node = labels.querySelector(`[data-k="${it.key}"]`);
      if (!node) return;
      const p = table.screen(it.at.clone().setZ(it.at.z + (it.key === 'dealer' ? -0.55 : 0.52)));
      node.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`;
    });
    const b = $('.bj-bubble');
    if (b.classList.contains('on')) {
      if (performance.now() > bubbleUntil) b.classList.remove('on');
      const p = table.screen(table.dealerHead());
      b.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -100%)`;
    }
  }

  // ---------- a round ----------
  async function dealTo(target, faceUp = true) {
    const card = draw();
    let to;
    if (target === 'dealer') {
      to = SPOTS.dealer(dealer.cards.length);
      dealer.cards.push(card);
    } else {
      const h = hands[target];
      to = SPOTS.hand(target, hands.length, h.cards.length);
      h.cards.push(card);
    }
    cardSnap();
    const entry = await table.deal(card, to, faceUp);
    if (target === 'dealer') {
      dealer.entries.push(entry);
      if (!faceUp) dealer.hole = card;
    } else hands[target].entries.push(entry);
    renderLabels();
    return card;
  }

  async function startRound() {
    if (phase !== 'bet' || !bet) return;
    if (bet > getBalance()) return toast(`You have ${money(getBalance())}. The dealer can count, unfortunately.`);
    lastBet = bet;
    adjust(-bet);
    phase = 'deal';
    await table.clearCards();
    if (shoe.length < DECKS * 52 * 0.25) {
      shoe = newShoe();
      say('shuffle');
      await wait(700);
    }
    hands = [{ cards: [], entries: [], bet, done: false, doubled: false }];
    dealer = { cards: [], entries: [], hole: null };
    insurance = 0;
    active = 0;
    table.setStack('bet0', bet, SPOTS.bet(0, 1));
    sound.chip();
    bet = 0;
    render();
    if (Math.random() < 0.35) say('deal');
    await dealTo(0);
    await wait(120);
    await dealTo('dealer');
    await wait(120);
    await dealTo(0);
    await wait(120);
    await dealTo('dealer', false);
    await wait(250);

    // an ace showing: insurance?
    if (dealer.cards[0].rank === 'A' && !isBlackjack(hands[0].cards)) {
      phase = 'insurance';
      say('insurance');
      render();
      return; // insYes / insNo carry on
    }
    await afterInsurance();
  }

  async function afterInsurance() {
    phase = 'deal';
    render();
    const up = rankValue(dealer.cards[0].rank);
    // the dealer peeks with an ace or a ten showing
    if ((up === 11 || up === 10) && isBlackjack(dealer.cards)) {
      await revealHole();
      table.gesture('dab', 3);
      say('dealerBJ');
      return settle();
    }
    if (insurance) {
      toast(`🛡️ No blackjack. Your ${money(insurance)} insurance is gone. As predicted.`);
    }
    if (isBlackjack(hands[0].cards)) {
      table.gesture('facepalm', 3);
      say('playerBJ');
      banner('BLACKJACK!', 'win');
      return dealerTurn();
    }
    phase = 'play';
    render();
  }

  async function revealHole() {
    const entry = dealer.entries[1];
    if (!entry || entry.faceUp) return;
    cardSnap();
    await table.flip(entry);
    dealer.hole = null;
    renderLabels();
  }

  async function nextHand() {
    const h = hands[active];
    h.done = true;
    if (active < hands.length - 1) {
      active++;
      // a split hand gets its second card when its turn comes
      if (hands[active].cards.length < 2) {
        await dealTo(active);
        if (hands[active].fromAces) return nextHand();
      }
      if (handValue(hands[active].cards).total === 21) return nextHand();
      phase = 'play';
      render();
      return;
    }
    return dealerTurn();
  }

  async function hit() {
    if (phase !== 'play') return;
    phase = 'deal';
    render();
    if (Math.random() < 0.3) say('hit');
    await dealTo(active);
    const v = handValue(hands[active].cards);
    phase = 'play';
    if (v.total > 21) {
      sound.blip(180, 0.25, 'sawtooth', 0.08);
      banner('BUST', 'lose');
      table.gesture('thumbsup', 2.4);
      say('bust');
      await wait(500);
      return nextHand();
    }
    if (v.total === 21) return nextHand();
    render();
  }

  async function stand() {
    if (phase !== 'play') return;
    if (handValue(hands[active].cards).total < 13 && Math.random() < 0.6) say('stand');
    phase = 'deal';
    return nextHand();
  }

  async function double() {
    const h = hands[active];
    if (phase !== 'play' || h.cards.length !== 2 || getBalance() < h.bet) return;
    adjust(-h.bet);
    h.bet *= 2;
    h.doubled = true;
    table.setStack('bet' + active, h.bet, SPOTS.bet(active, hands.length));
    sound.chip();
    say('double');
    phase = 'deal';
    render();
    await dealTo(active);
    if (handValue(h.cards).total > 21) {
      banner('BUST', 'lose');
      table.gesture('thumbsup', 2.4);
      say('bust');
      await wait(500);
    }
    return nextHand();
  }

  async function split() {
    const h = hands[0];
    if (phase !== 'play' || hands.length !== 1 || h.cards.length !== 2 || rankValue(h.cards[0].rank) !== rankValue(h.cards[1].rank) || getBalance() < h.bet) return;
    adjust(-h.bet);
    phase = 'deal';
    const aces = h.cards[0].rank === 'A';
    hands = [
      { cards: [h.cards[0]], entries: [h.entries[0]], bet: h.bet, done: false, doubled: false, fromSplit: true, fromAces: aces },
      { cards: [h.cards[1]], entries: [h.entries[1]], bet: h.bet, done: false, doubled: false, fromSplit: true, fromAces: aces },
    ];
    say('split');
    emit('blackjack', { type: 'split' });
    table.removeStack('bet0');
    table.setStack('bet0', h.bet, SPOTS.bet(0, 2));
    table.setStack('bet1', h.bet, SPOTS.bet(1, 2));
    sound.chip();
    render();
    await Promise.all([table.move(hands[0].entries[0], SPOTS.hand(0, 2, 0)), table.move(hands[1].entries[0], SPOTS.hand(1, 2, 0))]);
    await dealTo(0);
    // split aces get one card each, and that's it
    if (aces || handValue(hands[0].cards).total === 21) return nextHand();
    phase = 'play';
    render();
  }

  async function dealerTurn() {
    phase = 'dealer';
    render();
    await wait(300);
    await revealHole();
    const live = hands.some((h) => handValue(h.cards).total <= 21 && !(isBlackjack(h.cards) && !h.fromSplit));
    if (live) {
      while (handValue(dealer.cards).total < 17) {
        await wait(450);
        await dealTo('dealer');
      }
      if (handValue(dealer.cards).total > 21) {
        banner('DEALER BUSTS', 'win');
        say('dealerBust');
      }
    }
    await wait(350);
    settle();
  }

  async function settle() {
    phase = 'dealer';
    const d = handValue(dealer.cards).total;
    const dBJ = isBlackjack(dealer.cards);
    let staked = insurance;
    let returned = dBJ && insurance ? insurance * 3 : 0;
    const results = [];
    hands.forEach((h, i) => {
      staked += h.bet;
      const v = handValue(h.cards).total;
      const pBJ = isBlackjack(h.cards) && !h.fromSplit;
      let res;
      if (v > 21) res = 'lose';
      else if (pBJ && !dBJ) res = 'bj';
      else if (dBJ && !pBJ) res = 'lose';
      else if (pBJ && dBJ) res = 'push';
      else if (d > 21 || v > d) res = 'win';
      else if (v === d) res = 'push';
      else res = 'lose';
      const back = res === 'bj' ? h.bet * 2.5 : res === 'win' ? h.bet * 2 : res === 'push' ? h.bet : 0;
      returned += back;
      results.push({ res, back, h, i });
    });
    returned = Math.floor(returned);
    const net = returned - staked;

    // chips: the dealer pays winners next to their bet, then it all slides your way (or theirs)
    for (const r of results) {
      const key = 'bet' + r.i;
      if (r.res === 'win' || r.res === 'bj') {
        table.setStack('pay' + r.i, Math.floor(r.back - r.h.bet), SPOTS.bet(r.i, hands.length).add({ x: 0.42, y: 0, z: -0.05 }));
        sound.chip();
      }
    }
    await wait(results.some((r) => r.res === 'win' || r.res === 'bj') ? 650 : 250);
    await Promise.all(
      results.flatMap((r) => [table.sweepStack('bet' + r.i, r.res !== 'lose'), table.sweepStack('pay' + r.i, true)])
    );
    if (returned) adjust(returned);

    // what just happened, in words
    const any = (x) => results.some((r) => r.res === x);
    if (net > 0) {
      banner(any('bj') ? `BLACKJACK! +${money(net)}` : `YOU WIN ${money(net)}`, 'win');
      if (!any('bj') && d <= 21) say('win');
      const level = winLevel(net, staked);
      celebrate({ net, level, origin: { x: innerWidth / 2, y: innerHeight * 0.55 } });
      sound.win(level);
    } else if (net < 0) {
      banner(results.every((r) => r.res === 'lose') ? (hands.every((h) => handValue(h.cards).total > 21) ? 'BUST' : 'DEALER WINS') : `NET ${money(net)}`, 'lose');
      if (!dBJ && !hands.every((h) => handValue(h.cards).total > 21)) say('lose');
    } else {
      banner('PUSH', '');
      say('push');
    }

    // the rest of the casino wants to know
    results.forEach((r) => {
      if (r.res === 'bj') emit('blackjack', { type: 'natural' });
      if ((r.res === 'win' || r.res === 'bj') && r.h.doubled) emit('blackjack', { type: 'double' });
      if ((r.res === 'win' || r.res === 'bj') && r.h.cards.length >= 5) emit('blackjack', { type: 'charlie' });
    });
    onRound?.({ net, staked, multiple: returned / staked });

    phase = 'bet';
    bet = Math.min(lastBet, Math.floor(getBalance()));
    if (bet) table?.setStack('pending', bet, SPOTS.bet(0, 1)); // same again? press Deal
    render();
  }

  // ---------- input ----------
  function onClick(e) {
    const t = e.target.closest('button');
    if (!t || !el) return;
    if (t.classList.contains('bj-back')) return close();
    if (t.dataset.chip) {
      if (phase !== 'bet') return;
      const v = +t.dataset.chip;
      if (bet + v > getBalance()) return toast("You can't bet chips you don't have. Even here.");
      bet += v;
      sound.chip();
      table.setStack('pending', bet, SPOTS.bet(0, 1));
      return render();
    }
    const act = t.dataset.act;
    if (act === 'clear') {
      bet = 0;
      table.removeStack('pending');
      render();
    } else if (act === 'rebet') {
      bet = Math.min(lastBet, Math.floor(getBalance()));
      table.setStack('pending', bet, SPOTS.bet(0, 1));
      sound.chip();
      render();
    } else if (act === 'deal') {
      table.removeStack('pending');
      startRound();
    } else if (act === 'hit') hit();
    else if (act === 'stand') stand();
    else if (act === 'double') double();
    else if (act === 'split') split();
    else if (act === 'insYes' || act === 'insNo') {
      if (act === 'insYes') {
        insurance = Math.floor(hands[0].bet / 2);
        adjust(-insurance);
        sound.chip();
      }
      afterInsurance();
    }
  }

  /** Keys while you're at the table: H hit, S stand, D double, P split, Space/Enter deal, Esc leave. */
  function key(e) {
    if (!el || e.repeat) return;
    const k = e.code;
    const press = (act) => $(`[data-act="${act}"]:not(:disabled)`)?.click();
    if (k === 'Escape') {
      e.preventDefault();
      if (phase === 'bet') close();
    } else if (k === 'Space' || k === 'Enter') {
      e.preventDefault();
      if (phase === 'bet') press('deal');
      else if (phase === 'play') press('stand');
    } else if (k === 'KeyH') press('hit');
    else if (k === 'KeyS') press('stand');
    else if (k === 'KeyD') press('double');
    else if (k === 'KeyP') press('split');
  }

  // ---------- the room ----------
  function open() {
    if (el) return;
    el = document.createElement('div');
    el.className = 'bj';
    el.innerHTML = `
      <div class="bj-stage"></div>
      <button type="button" class="btn bj-back">← Back to roulette</button>
      <div class="bj-title"><b>🃏 BLACKJACK</b><small>Pays 3 to 2 · Dealer stands on all 17s</small></div>
      <div class="bj-labels"></div>
      <div class="bj-bubble"></div>
      <div class="bj-banner"></div>
      <div class="bj-bar">
        <div class="bj-money"><span>Balance <b class="bj-bal"></b></span><span>Bet <b class="bj-bet"></b></span></div>
        <div class="bj-chips">${CHIPS.map((v) => `<button type="button" class="bj-chip pchip c${v}" data-chip="${v}" aria-label="Add ${money(v)}">${v >= 1000 ? '1K' : v}</button>`).join('')}</div>
        <div class="bj-actions"></div>
      </div>`;
    document.body.appendChild(el);
    document.body.classList.add('in-blackjack');
    onOpen?.();
    table = new BlackjackTable($('.bj-stage'));
    table.onFrame = () => placeLabels();
    el.addEventListener('click', onClick);
    requestAnimationFrame(() => el?.classList.add('on'));
    phase = 'bet';
    hands = [];
    dealer = { cards: [], entries: [], hole: null };
    bet = Math.min(lastBet, Math.floor(getBalance()));
    if (bet) table.setStack('pending', bet, SPOTS.bet(0, 1));
    render();
    setTimeout(() => say('welcome'), 700);
    sound.blip(660, 0.08, 'triangle', 0.08);
  }

  function close() {
    if (!el || phase !== 'bet') return;
    const dying = el;
    const t = table;
    el = null;
    table = null;
    dying.classList.remove('on');
    setTimeout(() => {
      t?.dispose();
      dying.remove();
      document.body.classList.remove('in-blackjack');
      onClose?.();
    }, 350);
  }

  return { open, close, key, isOpen: () => !!el, refresh: render };
}
