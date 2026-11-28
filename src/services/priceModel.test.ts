import {
  TRADING_DAYS,
  cholesky,
  createIntradaySimulator,
  logReturns,
  mulberry32,
  normalSampler,
  paramsFor,
  pearson,
  simulateHistory,
  stdev,
  tradingDays,
} from './priceModel';
import { seedHoldings } from './seed';
import type { Holding } from '@/types/domain';

const END = Date.UTC(2026, 10, 27, 12);
const col = (prices: number[][], i: number) => prices.map((row) => row[i]);
const idx = (symbol: string) => seedHoldings.findIndex((h) => h.symbol === symbol);

describe('random numbers', () => {
  test('the generator is reproducible for a seed', () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    expect(Array.from({ length: 5 }, a)).toEqual(Array.from({ length: 5 }, b));
  });

  test('normal draws have mean ~0 and standard deviation ~1', () => {
    const normal = normalSampler(mulberry32(1));
    const xs = Array.from({ length: 50_000 }, normal);
    const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
    expect(Math.abs(mean)).toBeLessThan(0.02);
    expect(stdev(xs)).toBeCloseTo(1, 1);
  });
});

describe('cholesky', () => {
  test('reconstructs the matrix', () => {
    const m = [
      [1, 0.75, 0.1],
      [0.75, 1, 0.1],
      [0.1, 0.1, 1],
    ];
    const L = cholesky(m);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        const v = L[i].reduce((s, l, k) => s + l * L[j][k], 0);
        expect(v).toBeCloseTo(m[i][j], 10);
      }
    }
  });

  test('rejects a matrix that is not a valid correlation matrix', () => {
    expect(() => cholesky([[1, 2], [2, 1]])).toThrow('not positive definite');
  });
});

describe('daily history', () => {
  const history = simulateHistory(seedHoldings, { end: END });

  test('ends exactly at today\'s prices, one point per trading day', () => {
    expect(history.curve).toHaveLength(TRADING_DAYS);
    seedHoldings.forEach((h, i) => expect(history.prices[TRADING_DAYS - 1][i]).toBeCloseTo(h.price, 8));
    for (const t of history.dates) expect([0, 6]).not.toContain(new Date(t).getUTCDay());
    const sorted = [...history.dates].sort((a, b) => a - b);
    expect(history.dates).toEqual(sorted);
    expect(new Set(history.dates.map((t) => new Date(t).toISOString().slice(0, 10))).size).toBe(TRADING_DAYS);
  });

  test('is reproducible for the same seed', () => {
    expect(simulateHistory(seedHoldings, { end: END }).curve).toEqual(history.curve);
  });

  test('today\'s change per holding is the last daily return of the same path', () => {
    seedHoldings.forEach((_, i) => {
      const p = col(history.prices, i);
      expect(history.dayChangePct[i]).toBeCloseTo(p[p.length - 1] / p[p.length - 2] - 1, 10);
    });
    const cash = idx('CASH');
    expect(history.dayChangePct[cash]).toBe(0);
  });

  test('the portfolio\'s day move is ordinary, not a crash', () => {
    const v = history.curve.map((p) => p.value);
    const today = v[v.length - 1] / v[v.length - 2] - 1;
    expect(Math.abs(today)).toBeLessThan(0.03);
  });
});

describe('statistical properties over ten simulated years', () => {
  const long = simulateHistory(seedHoldings, { days: TRADING_DAYS * 10, seed: 99, end: END });
  const annualVol = (i: number) => stdev(logReturns(col(long.prices, i))) * Math.sqrt(TRADING_DAYS);

  test.each(['VTI', 'AAPL', 'BND', 'GLD'])('%s realized volatility matches its target', (symbol) => {
    const i = idx(symbol);
    const target = paramsFor(seedHoldings[i]).sigma;
    expect(Math.abs(annualVol(i) - target) / target).toBeLessThan(0.08);
  });

  test('cash does not move', () => {
    expect(annualVol(idx('CASH'))).toBe(0);
  });

  test('stocks move together; bonds barely move with stocks', () => {
    const r = (s: string) => logReturns(col(long.prices, idx(s)));
    expect(pearson(r('VTI'), r('AAPL'))).toBeCloseTo(0.75, 1);
    expect(Math.abs(pearson(r('VTI'), r('BND')) - 0.1)).toBeLessThan(0.07);
  });

  test('a diversified portfolio is less volatile than its stocks', () => {
    const portfolioVol =
      stdev(logReturns(long.curve.map((p) => p.value))) * Math.sqrt(TRADING_DAYS);
    expect(portfolioVol).toBeGreaterThan(0.06);
    expect(portfolioVol).toBeLessThan(annualVol(idx('VTI')));
  });
});

describe('intraday ticks', () => {
  test('stay at a realistic daily size no matter how long the page is open', () => {
    const sim = createIntradaySimulator(seedHoldings, mulberry32(5));
    const vti = idx('VTI');
    const dailySigma = paramsFor(seedHoldings[vti]).sigma / Math.sqrt(TRADING_DAYS);
    const path: number[] = [];
    for (let t = 0; t < 20_000; t++) path.push(sim.step()[vti]);
    // ~8 hours at one tick per 1.5 s: never beyond 5 daily standard deviations.
    expect(Math.max(...path.map(Math.abs))).toBeLessThan(5 * dailySigma);
    // Long-run spread is one day's volatility.
    expect(stdev(path.slice(2000))).toBeGreaterThan(0.6 * dailySigma);
    expect(stdev(path.slice(2000))).toBeLessThan(1.4 * dailySigma);
  });

  test('start from the current day change and keep cash fixed', () => {
    const holdings: Holding[] = seedHoldings.map((h) => ({ ...h, dayChangePct: 0.004 }));
    const sim = createIntradaySimulator(holdings, mulberry32(9));
    expect(Math.expm1(sim.state.x[idx('VTI')])).toBeCloseTo(0.004, 10);
    expect(sim.step()[idx('CASH')]).toBe(0);
  });
});

test('trading days skip weekends', () => {
  const days = tradingDays(10, Date.UTC(2026, 10, 29)); // a Sunday
  expect(days).toHaveLength(10);
  expect(new Date(days[days.length - 1]).getUTCDay()).toBe(5); // Friday
});
