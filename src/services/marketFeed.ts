import type { RootState } from '@/app/store';
import { selectTotalValue } from '@/features/portfolio/portfolioSlice';
import type { MarketTick } from '@/types/domain';
import { createIntradaySimulator } from '@/services/priceModel';

/**
 * Lightweight mock of a market data WebSocket, driven by a realistic price model.
 *
 * In production this would be a real WS subscription — `feed.subscribe`,
 * exponential reconnect, sequence-gap detection, etc. The shape is the same:
 * we receive ticks and fan them out to whichever store slices care.
 */
export interface MarketFeed {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
}

interface FeedOptions {
  /** Tick emission interval in ms. Default 1500ms (gentle on the eyes). */
  intervalMs?: number;
  /** Uniform [0, 1) source. Tests pass a seeded one; simulation only, not crypto. */
  random?: () => number;
}

/**
 * Each tick moves every non-cash holding together, with correlated, bounded
 * intraday noise from the price model (priceModel.ts). Today's point on the
 * daily curve is updated in place, so live ticks never push real days out of
 * the history or squeeze a "month" into a few seconds.
 */
export function createMarketFeed(
  getState: () => RootState,
  opts: FeedOptions = {},
): MarketFeed {
  const intervalMs = opts.intervalMs ?? 1500;
  const random = opts.random ?? Math.random;
  let timer: ReturnType<typeof setInterval> | null = null;
  let simulator: ReturnType<typeof createIntradaySimulator> | null = null;
  let simulatedSymbols = '';

  const tickOnce = () => {
    const state = getState();
    const holdings = state.portfolio.holdings;
    if (holdings.length === 0) return;

    // Rebuild the simulator if the set of holdings changed.
    const symbols = holdings.map((h) => h.symbol).join('|');
    if (!simulator || symbols !== simulatedSymbols) {
      simulator = createIntradaySimulator(holdings, random);
      simulatedSymbols = symbols;
    }
    const dayChanges = simulator.step();

    const now = Date.now();
    const ticks: MarketTick[] = holdings.flatMap((h, i) => {
      if (h.assetClass === 'cash') return [];
      const previousClose = h.price / (1 + h.dayChangePct);
      const price = round(previousClose * (1 + dayChanges[i]), 4);
      return [{ symbol: h.symbol, price, changePct: (price - h.price) / h.price, t: now }];
    });

    if (ticks.length === 0) return;
    state.tickReceived(ticks);
    state.holdingsRepriced(ticks);
    state.curveTodayUpdated(selectTotalValue(getState()));
  };

  return {
    start() {
      if (timer) return;
      timer = setInterval(tickOnce, intervalMs);
    },
    stop() {
      if (!timer) return;
      clearInterval(timer);
      timer = null;
    },
    isRunning() {
      return timer !== null;
    },
  };
}

function round(n: number, decimals: number): number {
  const k = 10 ** decimals;
  return Math.round(n * k) / k;
}
