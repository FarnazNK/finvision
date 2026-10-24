import { makeStore, toPersistable } from '@/app/store';
import {
  holdingsRepriced,
  loadAccountPortfolio,
  portfolioReset,
  selectIsAccountPortfolio,
  selectTotalValue,
} from '@/features/portfolio/portfolioSlice';
import { selectTransactions } from '@/features/transactions/transactionsSlice';
import { createMarketFeed } from '@/services/marketFeed';
import type { Holding } from '@/types/domain';

const TOKEN_KEY = 'finvision-access-token';

const accountHolding: Holding = {
  id: '7', symbol: 'AAPL', name: 'Apple', assetClass: 'equity',
  quantity: 2, costBasis: 150, price: 200, dayChangePct: 0.01, currency: 'USD',
};

function mockFetch(response: { status: number; body?: unknown }) {
  const fn = jest.fn().mockResolvedValue({
    ok: response.status >= 200 && response.status < 300,
    status: response.status,
    json: () => Promise.resolve(response.body),
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

beforeEach(() => {
  sessionStorage.clear();
});

describe('account portfolio', () => {
  test('loads the server snapshot and switches to account mode', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'token-123');
    const fetchMock = mockFetch({
      status: 200,
      body: { holdings: [accountHolding], baseCurrency: 'USD', priceSource: 'market' },
    });
    const store = makeStore();

    await store.dispatch(loadAccountPortfolio());

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/api/portfolio/snapshot');
    expect(init.headers.Authorization).toBe('Bearer token-123');
    const state = store.getState();
    expect(selectIsAccountPortfolio(state)).toBe(true);
    expect(state.portfolio.holdings).toEqual([accountHolding]);
    expect(state.portfolio.priceSource).toBe('market');
    expect(selectTotalValue(state)).toBe(400);
  });

  test('an expired session clears the token and reports the error', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'expired');
    mockFetch({ status: 401, body: { detail: 'Invalid or expired token' } });
    const store = makeStore();

    await store.dispatch(loadAccountPortfolio());

    expect(sessionStorage.getItem(TOKEN_KEY)).toBeNull();
    expect(store.getState().portfolio.source).toBe('demo');
    expect(store.getState().portfolio.error).toBe('Invalid or expired token');
  });

  test('does not call the API without a session', async () => {
    const fetchMock = mockFetch({ status: 200 });
    const store = makeStore();
    await store.dispatch(loadAccountPortfolio());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(store.getState().portfolio.source).toBe('demo');
  });

  test('simulated price ticks never change account holdings', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'token');
    mockFetch({
      status: 200,
      body: { holdings: [accountHolding], baseCurrency: 'USD', priceSource: 'market' },
    });
    const store = makeStore();
    await store.dispatch(loadAccountPortfolio());

    store.dispatch(holdingsRepriced([{ symbol: 'AAPL', price: 1, changePct: 0, t: 0 }]));
    expect(store.getState().portfolio.holdings[0].price).toBe(200);

    jest.useFakeTimers();
    const feed = createMarketFeed(store.dispatch, store.getState, { intervalMs: 10 });
    feed.start();
    jest.advanceTimersByTime(100);
    feed.stop();
    jest.useRealTimers();
    expect(store.getState().portfolio.holdings[0].price).toBe(200);
  });

  test('sign-out reset returns to the demo portfolio', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'token');
    mockFetch({
      status: 200,
      body: { holdings: [accountHolding], baseCurrency: 'USD', priceSource: 'market' },
    });
    const store = makeStore();
    await store.dispatch(loadAccountPortfolio());

    store.dispatch(portfolioReset());

    const portfolio = store.getState().portfolio;
    expect(portfolio.source).toBe('demo');
    expect(portfolio.priceSource).toBeNull();
    expect(portfolio.holdings.some((h) => h.symbol === 'AAPL' && h.id === '7')).toBe(false);
  });

  test('demo transactions are hidden next to a real account', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'token');
    mockFetch({
      status: 200,
      body: { holdings: [accountHolding], baseCurrency: 'USD', priceSource: 'market' },
    });
    const store = makeStore();
    expect(selectTransactions(store.getState()).length).toBeGreaterThan(0);

    await store.dispatch(loadAccountPortfolio());

    expect(selectTransactions(store.getState())).toEqual([]);
  });

  test('account holdings are never written to browser storage', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'token');
    mockFetch({
      status: 200,
      body: { holdings: [accountHolding], baseCurrency: 'USD', priceSource: 'market' },
    });
    const store = makeStore();
    await store.dispatch(loadAccountPortfolio());

    const persisted = toPersistable(store.getState());
    expect(persisted.portfolio).toBeUndefined();
    expect(persisted.ui).toBeDefined();

    store.dispatch(portfolioReset());
    expect(toPersistable(store.getState()).portfolio?.source).toBe('demo');
  });
});
