import { useEffect, useMemo } from 'react';
import { useAppStore } from '@/app/hooks';
import { store } from '@/app/store';
import { selectHoldings } from '@/features/portfolio/portfolioSlice';
import { selectWatchlist } from '@/features/watchlist/watchlistSlice';
import { selectLiveFeed } from '@/features/ui/uiSlice';
import { fetchQuotes, MAX_QUOTE_SYMBOLS } from '@/services/marketClient';

/** How often to ask the API for real quotes. The API caches each quote for 30 s. */
export const LIVE_QUOTES_INTERVAL_MS = 60_000;

/**
 * Prices holdings and watchlist symbols with real market quotes.
 *
 * Fetches one batch on load and then every minute while the tab is visible and
 * price updates aren't paused. Symbols with a real quote stop being simulated.
 * If the API has no quote provider configured or the request fails, the app
 * quietly stays on (or returns to) simulated demo prices.
 */
export function useLiveQuotes(getState = store.getState): void {
  const holdings = useAppStore(selectHoldings);
  const watchlist = useAppStore(selectWatchlist);
  const enabled = useAppStore(selectLiveFeed);

  // Depend on the set of symbols, not on prices, so ticks don't restart polling.
  const symbolsKey = useMemo(() => {
    const symbols = [
      ...holdings.filter((h) => h.assetClass !== 'cash').map((h) => h.symbol),
      ...watchlist.map((w) => w.symbol),
    ];
    return [...new Set(symbols)].slice(0, MAX_QUOTE_SYMBOLS).join(',');
  }, [holdings, watchlist]);

  useEffect(() => {
    if (!enabled || !symbolsKey) return;
    const symbols = symbolsKey.split(',');
    let controller: AbortController | null = null;
    let cancelled = false;

    const load = async () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      controller?.abort();
      controller = new AbortController();
      try {
        const { quotes } = await fetchQuotes(symbols, controller.signal);
        if (!cancelled) getState().liveQuotesReceived(quotes);
      } catch (e) {
        if (cancelled || (e as Error).name === 'AbortError') return;
        getState().liveQuotesUnavailable();
      }
    };

    void load();
    const timer = setInterval(() => void load(), LIVE_QUOTES_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') void load();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      controller?.abort();
      clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, symbolsKey, getState]);
}
