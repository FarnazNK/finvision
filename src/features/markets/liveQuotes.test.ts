import { makeStore } from '@/app/store';
import {
  selectLiveQuotes,
  selectPriceSource,
} from '@/features/markets/marketsSlice';
import { createMarketFeed } from '@/services/marketFeed';
import type { MarketQuote } from '@/services/schemas';

const quote = (symbol: string, current: number, changePercent = 1.5): MarketQuote => ({
  symbol,
  current,
  change: 0,
  changePercent,
  high: current,
  low: current,
  open: current,
  previousClose: current,
  timestamp: 1_700_000_000,
});

describe('live quotes', () => {
  test('real quotes reprice holdings and switch to market prices', () => {
    const store = makeStore();
    expect(selectPriceSource(store.getState())).toBe('demo');
    const curveBefore = store.getState().portfolio.curve.length;

    store.getState().liveQuotesReceived([quote('AAPL', 231.5, -0.8), quote('NVDA', 140)]);

    const s = store.getState();
    const aapl = s.portfolio.holdings.find((h) => h.symbol === 'AAPL')!;
    expect(aapl.price).toBe(231.5);
    expect(aapl.dayChangePct).toBeCloseTo(-0.008);
    expect(selectPriceSource(s)).toBe('live');
    expect(selectLiveQuotes(s).NVDA.price).toBe(140); // watchlist symbol
    expect(s.portfolio.curve.length).toBe(curveBefore + 1);
    expect(s.markets.history.AAPL.at(-1)?.price).toBe(231.5);
  });

  test('zero prices are ignored and unavailable returns to demo prices', () => {
    const store = makeStore();
    store.getState().liveQuotesReceived([quote('AAPL', 0)]);
    expect(selectPriceSource(store.getState())).toBe('demo');

    store.getState().liveQuotesReceived([quote('AAPL', 231.5)]);
    store.getState().liveQuotesUnavailable();
    expect(selectPriceSource(store.getState())).toBe('demo');
    expect(selectLiveQuotes(store.getState())).toEqual({});
  });

  test('state saved by an older version (no liveQuotes) reads as demo', () => {
    const store = makeStore({ markets: { history: {}, lastTickAt: null } });
    expect(selectPriceSource(store.getState())).toBe('demo');
    expect(selectLiveQuotes(store.getState())).toEqual({});
  });

  test('the simulated feed leaves really-priced holdings alone', () => {
    jest.useFakeTimers();
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const store = makeStore();
    const live = store
      .getState()
      .portfolio.holdings.filter((h) => h.assetClass !== 'cash' && h.symbol !== 'BND')
      .map((h) => quote(h.symbol, 100));
    store.getState().liveQuotesReceived(live);

    const feed = createMarketFeed(store.getState, { intervalMs: 10 });
    feed.start();
    jest.advanceTimersByTime(100);
    feed.stop();

    const s = store.getState();
    for (const q of live) {
      expect(s.portfolio.holdings.find((h) => h.symbol === q.symbol)!.price).toBe(100);
    }
    expect(s.portfolio.holdings.find((h) => h.symbol === 'BND')!.price).not.toBe(73.95);
    jest.restoreAllMocks();
    jest.useRealTimers();
  });
});
