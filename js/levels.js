// ⭐ Levels: every bet you make (roulette or slots) earns XP: more for bigger bets and long-shot
// wins, up to a cap per bet.
// Levels unlock the fancier store items and raise how much you can cash out to your wallet per day.

export const XP = { push: 5, loss: 3, cap: 60 };

/**
 * XP for one bet (one spin, however many chips were on it).
 *   betting:  10, +10 for every ×10 of stake ($1 → 10, $10 → 20, $100 → 30, $1,000+ → 40)
 *   the result: a win +10, or +20 at 5× your stake back, +30 at 20× (a straight-up number);
 *               a push +5, a loss +3
 *   never more than XP.cap
 *   then × mult (the high-roller table and whale mode), cap included
 * @param multiple  what came back ÷ what was staked
 */
export function betXp(outcome, stake = 1, multiple = 0, mult = 1) {
  const forBet = Math.min(40, 10 + 10 * Math.floor(Math.log10(Math.max(1, stake))));
  const forResult = outcome === 'win' ? (multiple >= 20 ? 30 : multiple >= 5 ? 20 : 10) : XP[outcome] || 0;
  return Math.round(Math.min(XP.cap, forBet + forResult) * mult);
}

/**
 * XP for buying a drink: 5, +5 for every ×10 of price ($8 lager → 5, $120 whiskey → 15),
 * doubled for bottle service (Pete's → 30, Dom → 50). Same cap as a bet.
 */
export function drinkXp(price, bottle = false) {
  const xp = 5 + 5 * Math.floor(Math.log10(Math.max(1, price)));
  return Math.min(XP.cap, bottle ? xp * 2 : xp);
}

/** XP it takes to go from `level` to the next one. */
export const xpToNext = (level) => 100 + 40 * (level - 1);

/** The level a store item needs: set on the item, or worked out from its price. */
export function itemLevel(item) {
  if (item.level) return item.level;
  const p = item.price;
  if (p < 100) return 1;
  if (p < 200) return 2;
  if (p < 300) return 3;
  if (p < 500) return 5;
  if (p < 800) return 7;
  if (p < 1000) return 9;
  if (p < 1500) return 11;
  if (p < 2500) return 14;
  if (p < 5000) return 17;
  if (p < 10000) return 20;
  return 25;
}

/**
 * @param onGain(amount, progress)  after any XP lands
 * @param onLevelUp(level)          once per level gained
 */
export function createLevels({ store, onGain, onLevelUp }) {
  let xp = store.get('fr.xp', 0);

  function progress() {
    let level = 1;
    let rest = xp;
    while (rest >= xpToNext(level)) rest -= xpToNext(level++);
    return { level, into: rest, need: xpToNext(level), xp };
  }

  function add(amount) {
    const before = progress().level;
    xp += amount;
    store.set('fr.xp', xp);
    const now = progress();
    onGain?.(amount, now);
    for (let l = before + 1; l <= now.level; l++) onLevelUp?.(l);
  }

  return {
    level: () => progress().level,
    progress,
    /** A bet was settled: 'win' | 'loss' | 'push', or 'placed' when there's no result yet (bonus buys). */
    bet: (outcome, stake, multiple, mult) => add(betXp(outcome, stake, multiple, mult)),
    /** XP from a challenge or an achievement */
    bonus: (xp) => add(xp),
    /** You bought a drink (or a bottle). */
    drink: (price, bottle) => add(drinkXp(price, bottle)),
  };
}
