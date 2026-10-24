import { askInsight } from '@/services/insightsClient';
import type { Holding } from '@/types/domain';

const TOKEN_KEY = 'finvision-access-token';

const demoHolding: Holding = {
  id: 'h_1', symbol: 'VTI', name: 'Vanguard', assetClass: 'equity',
  quantity: 1, costBasis: 1, price: 1, dayChangePct: 0, currency: 'USD',
};
const demoPortfolio = { holdings: [demoHolding], transactions: [], baseCurrency: 'USD' };

function mockFetch() {
  const fn = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ answer: 'ok', citations: [], model: 'offline-fallback' }),
  });
  global.fetch = fn as unknown as typeof fetch;
  return fn;
}

beforeEach(() => sessionStorage.clear());

describe('askInsight', () => {
  test('signed in: sends only the question, never portfolio figures', async () => {
    sessionStorage.setItem(TOKEN_KEY, 'token-abc');
    const fetchMock = mockFetch();

    await askInsight('How am I doing?', demoPortfolio);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/api/insights');
    expect(init.headers.Authorization).toBe('Bearer token-abc');
    expect(JSON.parse(init.body)).toEqual({ question: 'How am I doing?' });
  });

  test('signed out: uses the demo endpoint with the on-screen sample portfolio', async () => {
    const fetchMock = mockFetch();

    await askInsight('How am I doing?', demoPortfolio);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/api/demo/insights');
    expect(init.headers.Authorization).toBeUndefined();
    expect(JSON.parse(init.body).portfolio.holdings[0].symbol).toBe('VTI');
  });

  test('surfaces failures', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 429 }) as unknown as typeof fetch;
    await expect(askInsight('q', demoPortfolio)).rejects.toThrow('429');
  });
});
