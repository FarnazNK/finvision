import { makeStore, loadPersistedData, pickPersisted, STORAGE_KEY } from '@/app/store';
import { selectDayChangePct, selectTotalValue } from '@/features/portfolio/portfolioSlice';
import { createMarketFeed } from './marketFeed';
import { mulberry32 } from './priceModel';
import { demoHeadline } from './seed';

describe('market feed', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('hours of ticks keep the history intact and the day move realistic', () => {
    const store = makeStore();
    const before = store.getState().portfolio.curve;
    const feed = createMarketFeed(store.getState, { intervalMs: 1000, random: mulberry32(3) });
    feed.start();
    jest.advanceTimersByTime(4 * 60 * 60 * 1000); // 4 hours, 14,400 ticks
    feed.stop();

    const state = store.getState();
    const curve = state.portfolio.curve;
    // No points added: a "month" stays a month of trading days.
    expect(curve).toHaveLength(before.length);
    expect(curve[0]).toEqual(before[0]);
    // Today's point tracks the live value.
    expect(curve[curve.length - 1].value).toBeCloseTo(selectTotalValue(state), 1);
    // The portfolio's day change stays in a normal daily range.
    expect(Math.abs(selectDayChangePct(state))).toBeLessThan(0.03);
  });

  test('every non-cash holding moves on each tick; cash never does', () => {
    const store = makeStore();
    const feed = createMarketFeed(store.getState, { intervalMs: 1000, random: mulberry32(4) });
    const pricesBefore = store.getState().portfolio.holdings.map((h) => h.price);
    feed.start();
    jest.advanceTimersByTime(1000);
    feed.stop();
    store.getState().portfolio.holdings.forEach((h, i) => {
      if (h.assetClass === 'cash') expect(h.price).toBe(pricesBefore[i]);
      else expect(h.price).not.toBe(pricesBefore[i]);
    });
  });
});

describe('saved state', () => {
  beforeEach(() => localStorage.clear());

  test('simulated prices and history are never saved', () => {
    const saved = pickPersisted(makeStore().getState());
    expect(Object.keys(saved).sort()).toEqual(['transactions', 'ui', 'watchlist']);
  });

  test('the old format is migrated: user data kept, drifting prices dropped', () => {
    const watchlist = { items: [{ symbol: 'NVDA', name: 'NVIDIA', addedAt: '2026-10-01' }] };
    localStorage.setItem(
      'finvision-state-v1',
      JSON.stringify({ watchlist, portfolio: { holdings: [{ symbol: 'VTI', price: 1 }] } }),
    );
    const restored = loadPersistedData(localStorage);
    expect(restored).toEqual({ watchlist });
    expect(localStorage.getItem('finvision-state-v1')).toBeNull();
  });

  test('valid saved data is restored', () => {
    const ui = { themeMode: 'light', sidebarCollapsed: true, liveFeed: false, currency: 'EUR' };
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ui }));
    expect(loadPersistedData(localStorage)).toEqual({ ui });
  });

  test('tampered or malformed slices fall back to defaults', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ui: { themeMode: 'dark', sidebarCollapsed: false, liveFeed: true, currency: '<img src=x>' },
        watchlist: { items: [{ symbol: 'AAPL', name: 'Apple', addedAt: '2026-01-01' }] },
        transactions: { items: 'not-an-array', filter: 'all', search: '' },
        portfolio: { holdings: [{ symbol: 'EVIL', price: 1e12 }] },
      }),
    );
    const restored = loadPersistedData(localStorage) ?? {};
    expect(restored.ui).toBeUndefined();
    expect(restored.transactions).toBeUndefined();
    expect(restored.portfolio).toBeUndefined();
    expect(restored.watchlist?.items).toHaveLength(1);
  });

  test('oversized or unparseable saved state is ignored', () => {
    localStorage.setItem(STORAGE_KEY, 'x'.repeat(1_000_001));
    expect(loadPersistedData(localStorage)).toBeUndefined();
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadPersistedData(localStorage)).toBeUndefined();
  });
});

test('the landing page shows the same portfolio as the dashboard', () => {
  const headline = demoHeadline();
  expect(headline.value).toBeCloseTo(selectTotalValue(makeStore().getState()), 2);
  expect(Math.abs(headline.pastYearPct)).toBeLessThan(0.5);
  expect(headline.largestWeight).toBeGreaterThan(0.3);
});
