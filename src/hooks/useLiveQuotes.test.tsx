import { renderWithProviders, screen, waitFor } from '@/test/utils';
import { fetchQuotes } from '@/services/marketClient';
import { selectPriceSource } from '@/features/markets/marketsSlice';
import { WatchlistPage } from '@/pages/WatchlistPage';
import { initialUIState } from '@/features/ui/uiSlice';
import { useLiveQuotes } from './useLiveQuotes';

jest.mock('@/services/marketClient', () => ({
  MAX_QUOTE_SYMBOLS: 25,
  fetchQuotes: jest.fn(),
}));

const mockedFetch = fetchQuotes as jest.MockedFunction<typeof fetchQuotes>;

const q = (symbol: string, current: number, changePercent = 2) => ({
  symbol, current, change: 0, changePercent, high: 0, low: 0, open: 0, previousClose: 0,
  timestamp: 1_700_000_000,
});

function Harness() {
  useLiveQuotes();
  return <WatchlistPage />;
}

beforeEach(() => mockedFetch.mockReset());

describe('useLiveQuotes', () => {
  it('asks for holdings and watchlist symbols in one batch and shows real prices', async () => {
    mockedFetch.mockResolvedValue({ quotes: [q('AAPL', 231.5), q('NVDA', 140.25, -1.5)], unavailable: [] });
    const { store } = renderWithProviders(<Harness />);

    await waitFor(() => expect(selectPriceSource(store.getState())).toBe('live'));
    const symbols = mockedFetch.mock.calls[0][0];
    expect(symbols).toEqual(expect.arrayContaining(['VTI', 'AAPL', 'NVDA', 'TSLA']));
    expect(symbols).not.toContain('CASH');
    expect(mockedFetch).toHaveBeenCalledTimes(1);

    expect(screen.getByLabelText('NVDA price')).toHaveTextContent('$140.25');
    expect(screen.getByLabelText('NVDA price')).toHaveTextContent('-1.50%');
    expect(screen.getByLabelText('TSLA price')).toHaveTextContent('No quote');
    expect(store.getState().portfolio.holdings.find((h) => h.symbol === 'AAPL')!.price).toBe(231.5);
  });

  it('stays on demo prices when the API has no quotes', async () => {
    mockedFetch.mockRejectedValue(new Error('Market quotes request failed: 503'));
    const { store } = renderWithProviders(<Harness />);

    await waitFor(() => expect(mockedFetch).toHaveBeenCalled());
    expect(selectPriceSource(store.getState())).toBe('demo');
    expect(screen.getByLabelText('NVDA price')).toHaveTextContent('No quote');
  });

  it('does not fetch while price updates are paused', () => {
    renderWithProviders(<Harness />, { preloadedState: { ui: { ...initialUIState(), liveFeed: false } } });
    expect(mockedFetch).not.toHaveBeenCalled();
  });
});
