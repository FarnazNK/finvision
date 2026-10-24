import { fireEvent, screen, waitFor } from '@testing-library/react';
import { renderWithProviders } from '@/test/utils';
import { ManageHoldings } from '@/features/portfolio/ManageHoldings';
import type { Holding } from '@/types/domain';

const TOKEN_KEY = 'finvision-access-token';

const saved: Holding = {
  id: '9', symbol: 'MSFT', name: 'Microsoft', assetClass: 'equity',
  quantity: 0.5, costBasis: 400, price: 400, dayChangePct: 0, currency: 'USD',
};

function accountState(holdings: Holding[]) {
  return {
    portfolio: {
      source: 'account' as const,
      holdings,
      curve: [],
      lastUpdated: null,
      priceSource: 'cost_basis' as const,
      loading: false,
      error: null,
    },
  };
}

beforeEach(() => {
  sessionStorage.clear();
  sessionStorage.setItem(TOKEN_KEY, 'token');
});

function fill(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

test('rejects quantities that are not positive decimals', () => {
  global.fetch = jest.fn() as unknown as typeof fetch;
  renderWithProviders(<ManageHoldings />, { preloadedState: accountState([]) });

  fill('Symbol', 'aapl');
  fill('Name', 'Apple');
  fill('Quantity', '1e3');
  fill('Cost per unit', '10');
  fireEvent.click(screen.getByRole('button', { name: 'Add holding' }));

  expect(screen.getByRole('alert')).toHaveTextContent('Quantity must be a positive number');
  expect(global.fetch).not.toHaveBeenCalled();
});

test('sends the exact decimals typed in, then shows the saved holding', async () => {
  const fetchMock = jest
    .fn()
    // POST /api/portfolio/holdings
    .mockResolvedValueOnce({ ok: true, status: 201, json: () => Promise.resolve({}) })
    // GET /api/portfolio/snapshot
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () =>
        Promise.resolve({ holdings: [saved], baseCurrency: 'USD', priceSource: 'cost_basis' }),
    });
  global.fetch = fetchMock as unknown as typeof fetch;
  renderWithProviders(<ManageHoldings />, { preloadedState: accountState([]) });

  fill('Symbol', 'msft');
  fill('Name', 'Microsoft');
  fill('Quantity', '0.50');
  fill('Cost per unit', '400.10');
  fireEvent.click(screen.getByRole('button', { name: 'Add holding' }));

  await waitFor(() => expect(screen.getByRole('button', { name: 'Remove MSFT' })).toBeInTheDocument());
  const [url, init] = fetchMock.mock.calls[0];
  expect(url).toBe('http://api.test/api/portfolio/holdings');
  expect(JSON.parse(init.body)).toMatchObject({
    symbol: 'MSFT',
    quantity: '0.50',
    costBasis: '400.10',
  });
});

test('removes a holding through the API', async () => {
  const fetchMock = jest
    .fn()
    .mockResolvedValueOnce({ ok: true, status: 204, json: () => Promise.resolve(undefined) })
    .mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ holdings: [], baseCurrency: 'USD', priceSource: 'empty' }),
    });
  global.fetch = fetchMock as unknown as typeof fetch;
  renderWithProviders(<ManageHoldings />, { preloadedState: accountState([saved]) });

  fireEvent.click(screen.getByRole('button', { name: 'Remove MSFT' }));

  await waitFor(() => expect(screen.getByText(/No holdings yet/)).toBeInTheDocument());
  expect(fetchMock.mock.calls[0][0]).toBe('http://api.test/api/portfolio/holdings/9');
  expect(fetchMock.mock.calls[0][1].method).toBe('DELETE');
});
