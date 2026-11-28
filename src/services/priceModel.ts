/**
 * Simulated market prices that behave like real ones.
 *
 * The public demo has no paid market-data feed, so prices are simulated. They
 * should still pass a quant's sniff test: realistic volatility per asset,
 * correlated moves (stocks move together, bonds and gold mostly don't), and a
 * history that agrees with today's numbers.
 *
 * Model
 * -----
 * - **Daily history:** geometric Brownian motion over 252 trading days,
 *   S(t+1) = S(t) · exp((μ − σ²/2)·Δt + σ·√Δt·Z), with Δt = 1/252 and
 *   correlated normal shocks Z = L·ε, where L is the Cholesky factor of the
 *   correlation matrix. The path is anchored so its last close is today's seed
 *   price, and each holding's day change is that last daily return. The chart
 *   and the "Day's change" tile therefore come from the same numbers.
 * - **Live ticks:** intraday noise around yesterday's close, modelled as a
 *   mean-reverting (Ornstein–Uhlenbeck) log-return whose long-run spread is one
 *   day's volatility. The day's move stays at a realistic daily size however
 *   long the page is open, instead of drifting without limit.
 *
 * Everything is driven by a seeded generator, so the demo is reproducible and
 * testable. The generator is NOT cryptographically secure and must never be
 * used for anything security-related (tokens, IDs, secrets).
 *
 * Simplifications, stated so nobody mistakes this for market data: normal
 * returns (no fat tails or volatility clustering), constant parameters,
 * holdings held constant over the history (past trades are not replayed), and
 * weekends skipped but not holidays.
 */
import type { AssetClass, Holding, PortfolioPoint } from '@/types/domain';

export const TRADING_DAYS = 252;

export interface AssetParams {
  /** Annualized drift (expected log-price growth before the σ²/2 correction). */
  mu: number;
  /** Annualized volatility. */
  sigma: number;
}

/** Long-run ballpark figures for the seeded symbols. Not forecasts. */
const SYMBOL_PARAMS: Record<string, AssetParams> = {
  VTI: { mu: 0.08, sigma: 0.16 },
  VXUS: { mu: 0.06, sigma: 0.17 },
  BND: { mu: 0.03, sigma: 0.06 },
  AAPL: { mu: 0.1, sigma: 0.27 },
  MSFT: { mu: 0.1, sigma: 0.25 },
  GLD: { mu: 0.04, sigma: 0.15 },
};

const CLASS_PARAMS: Record<AssetClass, AssetParams> = {
  equity: { mu: 0.08, sigma: 0.22 },
  fixed_income: { mu: 0.03, sigma: 0.06 },
  alternative: { mu: 0.04, sigma: 0.15 },
  crypto: { mu: 0.1, sigma: 0.6 },
  cash: { mu: 0, sigma: 0 },
};

/** Pairwise correlations by asset class (symmetric; same class = within-class). */
const CLASS_CORR: Record<AssetClass, Partial<Record<AssetClass, number>>> = {
  equity: { equity: 0.75, fixed_income: 0.1, alternative: 0.1, crypto: 0.35 },
  fixed_income: { fixed_income: 0.8, alternative: 0.3, crypto: 0.05 },
  alternative: { alternative: 0.6, crypto: 0.1 },
  crypto: { crypto: 0.8 },
  cash: {},
};

export function paramsFor(h: Pick<Holding, 'symbol' | 'assetClass'>): AssetParams {
  if (h.assetClass === 'cash') return CLASS_PARAMS.cash;
  return SYMBOL_PARAMS[h.symbol] ?? CLASS_PARAMS[h.assetClass] ?? CLASS_PARAMS.equity;
}

export function correlation(a: AssetClass, b: AssetClass): number {
  if (a === 'cash' || b === 'cash') return 0;
  return CLASS_CORR[a]?.[b] ?? CLASS_CORR[b]?.[a] ?? 0;
}

// ---------- Random numbers ----------

/** mulberry32: small, fast, seeded PRNG for simulation only (not crypto). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Standard normal draws via Box–Muller. */
export function normalSampler(uniform: () => number): () => number {
  let spare: number | null = null;
  return () => {
    if (spare !== null) {
      const s = spare;
      spare = null;
      return s;
    }
    let u = 0;
    while (u <= Number.EPSILON) u = uniform();
    const v = uniform();
    const r = Math.sqrt(-2 * Math.log(u));
    spare = r * Math.sin(2 * Math.PI * v);
    return r * Math.cos(2 * Math.PI * v);
  };
}

// ---------- Linear algebra ----------

/**
 * Lower-triangular L with L·Lᵀ = matrix. If rounding leaves the matrix not
 * quite positive definite, a tiny ridge is added to the diagonal and retried.
 */
export function cholesky(matrix: number[][]): number[][] {
  const n = matrix.length;
  for (let ridge = 0; ridge <= 1e-3; ridge = ridge === 0 ? 1e-10 : ridge * 10) {
    const L = Array.from({ length: n }, () => new Array<number>(n).fill(0));
    let ok = true;
    for (let i = 0; i < n && ok; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = matrix[i][j] + (i === j ? ridge : 0);
        for (let k = 0; k < j; k++) sum -= L[i][k] * L[j][k];
        if (i === j) {
          if (sum <= 0) {
            ok = false;
            break;
          }
          L[i][j] = Math.sqrt(sum);
        } else {
          L[i][j] = sum / L[j][j];
        }
      }
    }
    if (ok) return L;
  }
  throw new Error('Correlation matrix is not positive definite');
}

export function correlationMatrix(holdings: Pick<Holding, 'symbol' | 'assetClass'>[]): number[][] {
  return holdings.map((a, i) =>
    holdings.map((b, j) => (i === j ? 1 : correlation(a.assetClass, b.assetClass))),
  );
}

/** One vector of correlated standard normals, Z = L·ε. */
function correlatedShocks(L: number[][], normal: () => number): number[] {
  const eps = L.map(() => normal());
  return L.map((row) => row.reduce((sum, l, k) => sum + l * eps[k], 0));
}

// ---------- Daily history ----------

export interface SimulatedHistory {
  /** One close per trading day, oldest first; last entry is today's close. */
  dates: number[];
  /** prices[d][i] = close of holding i on day d. */
  prices: number[][];
  /** Portfolio value per day, matching `dates`. */
  curve: PortfolioPoint[];
  /** Each holding's last daily return (today vs. previous close). */
  dayChangePct: number[];
}

/** Trading-day timestamps (weekdays) ending at `end`, oldest first. */
export function tradingDays(count: number, end: number): number[] {
  const out: number[] = [];
  const day = new Date(end);
  day.setUTCHours(21, 0, 0, 0); // a fixed "close" time keeps points one per day
  while (out.length < count) {
    const dow = day.getUTCDay();
    if (dow !== 0 && dow !== 6) out.push(day.getTime());
    day.setUTCDate(day.getUTCDate() - 1);
  }
  return out.reverse();
}

export function simulateHistory(
  holdings: Holding[],
  { days = TRADING_DAYS, seed = 20260101, end = Date.now() } = {},
): SimulatedHistory {
  const n = holdings.length;
  const normal = normalSampler(mulberry32(seed));
  const L = cholesky(correlationMatrix(holdings));
  const params = holdings.map(paramsFor);
  const dt = 1 / TRADING_DAYS;

  // Simulate log-returns forward, then anchor the path so the final close is
  // exactly today's price: log S(d) = log S(today) − Σ returns after day d.
  const returns: number[][] = [];
  for (let d = 1; d < days; d++) {
    const z = correlatedShocks(L, normal);
    returns.push(params.map((p, i) => (p.mu - (p.sigma ** 2) / 2) * dt + p.sigma * Math.sqrt(dt) * z[i]));
  }
  const prices: number[][] = new Array(days);
  prices[days - 1] = holdings.map((h) => h.price);
  for (let d = days - 2; d >= 0; d--) {
    prices[d] = prices[d + 1].map((p, i) => p / Math.exp(returns[d][i]));
  }

  const dates = tradingDays(days, end);
  const curve = dates.map((t, d) => ({
    t,
    value: round2(holdings.reduce((sum, h, i) => sum + h.quantity * prices[d][i], 0)),
  }));
  const last = returns[returns.length - 1] ?? new Array(n).fill(0);
  return { dates, prices, curve, dayChangePct: last.map((r) => Math.expm1(r)) };
}

// ---------- Intraday ticks ----------

export interface IntradayState {
  /** Per holding: log(price / previous close). */
  x: number[];
}

export interface IntradayOptions {
  /** Ticks for the intraday deviation to lose half its distance to zero. */
  halfLifeTicks?: number;
}

/**
 * Bounded, correlated intraday moves. Each tick updates every non-cash holding
 * with an Ornstein–Uhlenbeck step whose stationary standard deviation is the
 * asset's one-day volatility σ/√252, so the day's change stays realistic.
 */
export function createIntradaySimulator(
  holdings: Holding[],
  uniform: () => number,
  { halfLifeTicks = 120 }: IntradayOptions = {},
) {
  const normal = normalSampler(uniform);
  const L = cholesky(correlationMatrix(holdings));
  const daily = holdings.map((h) => paramsFor(h).sigma / Math.sqrt(TRADING_DAYS));
  const phi = Math.exp(-Math.LN2 / halfLifeTicks);
  const shockScale = Math.sqrt(1 - phi * phi);
  const state: IntradayState = {
    x: holdings.map((h) => Math.log1p(h.dayChangePct > -1 ? h.dayChangePct : 0)),
  };

  return {
    state,
    /** Advance one tick; returns each holding's new day change (fraction). */
    step(): number[] {
      const z = correlatedShocks(L, normal);
      state.x = state.x.map((x, i) => phi * x + shockScale * daily[i] * z[i]);
      return state.x.map((x, i) => (daily[i] === 0 ? 0 : Math.expm1(x)));
    },
  };
}

// ---------- Risk helpers (used by tests and, later, the risk module) ----------

export function logReturns(series: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < series.length; i++) out.push(Math.log(series[i] / series[i - 1]));
  return out;
}

export function stdev(xs: number[]): number {
  const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
  return Math.sqrt(xs.reduce((a, b) => a + (b - mean) ** 2, 0) / (xs.length - 1));
}

export function pearson(a: number[], b: number[]): number {
  const ma = a.reduce((s, v) => s + v, 0) / a.length;
  const mb = b.reduce((s, v) => s + v, 0) / b.length;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  return num / Math.sqrt(da * db);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
