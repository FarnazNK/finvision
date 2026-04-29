import type { AppDispatch, RootState } from '@/app/store';
import { tickReceived } from '@/features/markets/marketsSlice';
import { holdingsRepriced } from '@/features/portfolio/portfolioSlice';
import type { MarketTick } from '@/types/domain';

/**
 * Lightweight mock of a market data WebSocket.
 *
 * In production this would be a real WS subscription — `feed.subscribe`,
 * exponential reconnect, sequence-gap detection, etc. The shape is the same:
 * we receive ticks and fan them out to whichever slices care.
 */
export interface MarketFeed {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
}

interface FeedOptions {
  /** Tick emission interval in ms. Default 1500ms (gentle on the eyes). */
  intervalMs?: number;
  /** Per-tick magnitude — clamps the random walk. */
  volatility?: number;
}

export function createMarketFeed(
  dispatch: AppDispatch,
  getState: () => RootState,
  opts: FeedOptions = {},
): MarketFeed {
  const intervalMs = opts.intervalMs ?? 1500;
  const volatility = opts.volatility ?? 0.0035;
  let timer: ReturnType<typeof setInterval> | null = null;

  const tickOnce = () => {
    const state = getState();
    const holdings = state.portfolio.holdings;
    if (holdings.length === 0) return;

    // Pick 1–3 holdings to "tick" each round so changes feel organic.
    const n = 1 + Math.floor(Math.random() * 3);
    const picks = sampleN(holdings, n);

    const ticks: MarketTick[] = picks
      .filter((h) => h.assetClass !== 'cash')
      .map((h) => {
        const drift = (Math.random() - 0.5) * 2 * volatility;
        const newPrice = round(h.price * (1 + drift), 4);
        const changePct = (newPrice - h.costBasis) / h.costBasis;
        return {
          symbol: h.symbol,
          price: newPrice,
          changePct,
          t: Date.now(),
        };
      });

    if (ticks.length === 0) return;
    dispatch(tickReceived(ticks));
    dispatch(holdingsRepriced(ticks));
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

function sampleN<T>(arr: T[], n: number): T[] {
  const copy = arr.slice();
  const out: T[] = [];
  for (let i = 0; i < n && copy.length > 0; i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function round(n: number, decimals: number): number {
  const k = 10 ** decimals;
  return Math.round(n * k) / k;
}
