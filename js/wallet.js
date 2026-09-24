// 👛 Your wallet: the only money the store takes. You fill it by cashing out chips from the
// casino, but only so much per day (more as you level up). Fake cards buy chips, not crowns.

const today = () => new Date().toDateString();

/** $ in chips for every $1 in the wallet. */
export const RATE = 10;

/** How much you may cash out per day at a level. */
export const dailyLimit = (level) => 200 + 100 * level;

/** @param level () => your current level */
export function createWallet({ store, level }) {
  let cash = store.get('fr.wallet', 0);
  let day = store.get('fr.wallet.day', { date: today(), out: 0 });
  const save = () => {
    store.set('fr.wallet', cash);
    store.set('fr.wallet.day', day);
  };
  // a new day, a new limit (midnight, your time)
  const fresh = () => {
    if (day.date !== today()) day = { date: today(), out: 0 };
  };

  const left = () => {
    fresh();
    return Math.max(0, dailyLimit(level()) - day.out);
  };

  return {
    cash: () => cash,
    limit: () => dailyLimit(level()),
    left,
    /** Put up to `amount` wallet dollars in (costing amount × RATE in chips); returns what went in. */
    withdraw(amount) {
      const n = Math.max(0, Math.min(Math.floor(amount), left()));
      cash += n;
      day.out += n;
      save();
      return n;
    },
    spend(v) {
      cash -= v;
      save();
    },
  };
}
