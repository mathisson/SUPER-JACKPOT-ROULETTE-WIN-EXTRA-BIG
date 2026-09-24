// 🐉 DRAGON RUSH WIN BIG: the maths. Pure functions, no DOM, so it can be simulated in node.
// 7×7 grid, CLUSTER PAYS (5+ touching, up/down/left/right), TUMBLES, and MULTIPLIER SPOTS:
// a spot is marked the first time a winning symbol explodes on it, then becomes ×2 and doubles
// on every further explosion, up to ×1024. Cluster wins are multiplied by the sum of the spots under them.
// Base game spots reset every spin; in FREE SPINS they stick for the whole bonus.

export const COLS = 7;
export const ROWS = 7;
export const MULT_MAX = 1024;
export const MIN_CLUSTER = 5;

// low → high. 'pearl' is the scatter: the flaming pearl the dragon chases.
export const SYMS = ['sapph', 'amethyst', 'jade', 'amber', 'lantern', 'ingot', 'dragon'];
export const WEIGHTS = { sapph: 16, amethyst: 16, jade: 15, amber: 14, lantern: 13, ingot: 12, dragon: 11, pearl: 0.55 };
// free spins are lumpier: more clusters, so the sticky multiplier spots actually grow
export const FS_WEIGHTS = { sapph: 25, amethyst: 21, jade: 17, amber: 14, lantern: 9.5, ingot: 6.5, dragon: 4.5, pearl: 0.5 };

// pays × total bet for cluster size 5, 6, … 15+
const CURVE = [1, 1.5, 2, 3, 4, 6, 8, 12, 20, 40, 100];
const BASE = { sapph: 0.2, amethyst: 0.25, jade: 0.3, amber: 0.4, lantern: 0.6, ingot: 1, dragon: 1.5 };
export const SCALE = 3.2;
export const PAYS = Object.fromEntries(
  SYMS.map((s) => [s, CURVE.map((c) => Math.round(BASE[s] * c * SCALE * 100) / 100)]),
);
export const payFor = (sym, size) => PAYS[sym][Math.min(size, 15) - MIN_CLUSTER] || 0;

// scatters anywhere on the final grid → free spins
// BUY BONUS menu. Simulated over 20k bonuses each:
//   FREE SPINS: 10 spins, averages ~96× bet  → costs 100×
//   SUPER FREE SPINS: 10 spins with every spot already ×2, averages ~577× bet → costs 600×
export const BUYS = [
  { id: 'normal', name: 'FREE SPINS', cost: 100, spins: 10, start: 0, blurb: '10 free spins. Multiplier spots stick all bonus.' },
  { id: 'super', name: 'SUPER FREE SPINS', cost: 600, spins: 10, start: 2, blurb: '10 free spins and EVERY spot starts at ×2. Absolute chaos.' },
];
// simulated over 400k spins: base game ~65%, free spins ~31%, total ~96% return
export const FREE_SPINS = { 3: 10, 4: 12, 5: 15, 6: 20, 7: 30 };
export const freeSpinsFor = (n) => (n >= 3 ? FREE_SPINS[Math.min(n, 7)] : 0);

export const rand01 = () => {
  const b = new Uint32Array(1);
  crypto.getRandomValues(b);
  return b[0] / 2 ** 32;
};

const table = (w) => ({ w, ids: Object.keys(w), total: Object.values(w).reduce((a, b) => a + b, 0) });
const BASE_T = table(WEIGHTS);
const FS_T = table(FS_WEIGHTS);
export function rollSym(rng = rand01, free = false) {
  const t = free ? FS_T : BASE_T;
  let r = rng() * t.total;
  for (const id of t.ids) if ((r -= t.w[id]) < 0) return id;
  return 'sapph';
}

// grid[c][r], r = 0 is the top row
export const newGrid = (rng = rand01, free = false) =>
  Array.from({ length: COLS }, () => Array.from({ length: ROWS }, () => rollSym(rng, free)));
export const newSpots = () => Array.from({ length: COLS }, () => Array(ROWS).fill(0));

export function findClusters(grid) {
  const seen = newSpots();
  const out = [];
  for (let c = 0; c < COLS; c++)
    for (let r = 0; r < ROWS; r++) {
      const sym = grid[c][r];
      if (seen[c][r] || sym === 'pearl') continue;
      const cells = [];
      const stack = [[c, r]];
      seen[c][r] = 1;
      while (stack.length) {
        const [x, y] = stack.pop();
        cells.push([x, y]);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || seen[nx][ny] || grid[nx][ny] !== sym) continue;
          seen[nx][ny] = 1;
          stack.push([nx, ny]);
        }
      }
      if (cells.length >= MIN_CLUSTER) out.push({ sym, cells });
    }
  return out;
}

// the multiplier a spot contributes (0 = none)
export const spotMult = (v) => (v >= 2 ? v : 0);
export const bumpSpot = (v) => (v === 0 ? 1 : v === 1 ? 2 : Math.min(MULT_MAX, v * 2));

/** Remove cells, let survivors fall, fill from the top. Returns the new grid and the moves to animate. */
export function tumble(grid, removed, rng = rand01, free = false) {
  const gone = new Set(removed.map(([c, r]) => c * ROWS + r));
  const next = [];
  const moves = []; // {c, from, to}
  const fresh = []; // {c, r, sym, drop}  drop = how many cells above the grid it starts
  for (let c = 0; c < COLS; c++) {
    const keep = [];
    for (let r = 0; r < ROWS; r++) if (!gone.has(c * ROWS + r)) keep.push(r);
    const n = ROWS - keep.length;
    const col = [];
    for (let i = 0; i < n; i++) {
      const sym = rollSym(rng, free);
      col.push(sym);
      fresh.push({ c, r: i, sym, drop: n });
    }
    keep.forEach((r, i) => {
      col.push(grid[c][r]);
      if (r !== n + i) moves.push({ c, from: r, to: n + i });
    });
    next.push(col);
  }
  return { grid: next, moves, fresh };
}

/**
 * Play one whole spin (all tumbles). `spots` is mutated (pass the free-spin spots to keep them).
 * Returns every step so the UI can animate it, plus the total.
 */
export function playSpin({ bet, spots = newSpots(), rng = rand01, free = false, grid = newGrid(rng, free) }) {
  const start = grid;
  const steps = [];
  let total = 0;
  for (;;) {
    const clusters = findClusters(grid);
    if (!clusters.length) break;
    const removed = [];
    let stepWin = 0;
    for (const cl of clusters) {
      const mult = cl.cells.reduce((s, [c, r]) => s + spotMult(spots[c][r]), 0) || 1;
      cl.base = payFor(cl.sym, cl.cells.length) * bet;
      cl.mult = mult;
      cl.win = cl.base * mult;
      stepWin += cl.win;
      removed.push(...cl.cells);
    }
    // spots change after the wins are counted
    const spotChanges = removed.map(([c, r]) => {
      spots[c][r] = bumpSpot(spots[c][r]);
      return { c, r, v: spots[c][r] };
    });
    const t = tumble(grid, removed, rng, free);
    steps.push({ clusters, win: stepWin, spotChanges, ...t });
    total += stepWin;
    grid = t.grid;
  }
  const pearls = grid.flat().filter((s) => s === 'pearl').length;
  return { start, steps, total, final: grid, pearls, spots };
}
