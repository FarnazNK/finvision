import type { MarketTick } from '@/types/domain';
import type { MarketQuote } from '@/services/schemas';
import type { Mutate, RootState } from '@/app/store';
import { createSelector } from '@/app/createSelector';

export interface MarketsState {
  /** Per-symbol rolling tick history, capped per symbol. */
  history: Record<string, MarketTick[]>;
  /** Last tick processed (for "last update" UI). */
  lastTickAt: number | null;
  /**
   * Latest real quote per symbol from the API (Finnhub). Symbols here are
   * priced from the market, and the simulated feed leaves them alone.
   * Optional because state saved by older versions doesn't have it.
   */
  liveQuotes?: Record<string, LiveQuote>;
  /** When the last batch of real quotes arrived; null in demo mode. */
  quotedAt?: number | null;
}

export interface LiveQuote {
  price: number;
  /** Day change as a fraction (0.0123 = +1.23%). */
  changePct: number;
  /** Provider timestamp of the quote, in ms. */
  t: number;
}

const HISTORY_CAP = 60;

export function initialMarketsState(): MarketsState {
  return { history: {}, lastTickAt: null, liveQuotes: {}, quotedAt: null };
}

export interface MarketsActions {
  tickReceived: (ticks: MarketTick[]) => void;
  historyCleared: () => void;
  /** Apply real quotes to the markets data, holdings and portfolio curve. */
  liveQuotesReceived: (quotes: MarketQuote[]) => void;
  /** Quotes couldn't be fetched: go back to simulated demo prices. */
  liveQuotesUnavailable: () => void;
}

export function createMarketsActions(mutate: Mutate): MarketsActions {
  return {
    tickReceived: (ticks) =>
      mutate(({ markets }) => {
        for (const tick of ticks) {
          const existing = markets.history[tick.symbol] ?? [];
          existing.push(tick);
          if (existing.length > HISTORY_CAP) existing.shift();
          markets.history[tick.symbol] = existing;
        }
        markets.lastTickAt = Date.now();
      }),
    historyCleared: () =>
      mutate(({ markets }) => {
        markets.history = {};
        markets.lastTickAt = null;
      }),
    liveQuotesReceived: (quotes) =>
      mutate(({ markets, portfolio }) => {
        const now = Date.now();
        const live: Record<string, LiveQuote> = {};
        for (const q of quotes) {
          if (!(q.current > 0)) continue;
          live[q.symbol] = {
            price: q.current,
            changePct: q.changePercent / 100,
            t: q.timestamp ? q.timestamp * 1000 : now,
          };
        }
        if (Object.keys(live).length === 0) return;
        markets.liveQuotes = live;
        markets.quotedAt = now;

        let repriced = false;
        for (const h of portfolio.holdings) {
          const q = live[h.symbol];
          if (!q) continue;
          h.price = q.price;
          h.dayChangePct = q.changePct;
          repriced = true;
        }
        for (const [symbol, q] of Object.entries(live)) {
          const existing = markets.history[symbol] ?? [];
          const last = existing[existing.length - 1];
          if (!last || last.price !== q.price) {
            existing.push({ symbol, price: q.price, changePct: q.changePct, t: now });
            if (existing.length > HISTORY_CAP) existing.shift();
          }
          markets.history[symbol] = existing;
        }
        markets.lastTickAt = now;
        if (repriced) {
          const value = portfolio.holdings.reduce((sum, h) => sum + h.quantity * h.price, 0);
          portfolio.curve.push({ t: now, value });
          if (portfolio.curve.length > 800) portfolio.curve.shift();
          portfolio.lastUpdated = new Date(now).toISOString();
        }
      }),
    liveQuotesUnavailable: () =>
      mutate(({ markets }) => {
        markets.liveQuotes = {};
        markets.quotedAt = null;
      }),
  };
}

// ---------- Selectors ----------

export const selectMarketHistory = (s: RootState) => s.markets.history;
export const selectLastTickAt = (s: RootState) => s.markets.lastTickAt;

const NO_QUOTES: Record<string, LiveQuote> = {};
export const selectLiveQuotes = (s: RootState) => s.markets.liveQuotes ?? NO_QUOTES;
export const selectQuotedAt = (s: RootState) => s.markets.quotedAt ?? null;
/** 'live' when real quotes have priced at least one symbol, else 'demo'. */
export const selectPriceSource = (s: RootState): 'live' | 'demo' =>
  s.markets.quotedAt && Object.keys(s.markets.liveQuotes ?? {}).length > 0 ? 'live' : 'demo';

const NO_TICKS: MarketTick[] = [];

export const makeSelectSparkline = (symbol: string) =>
  createSelector([selectMarketHistory], (h) => h[symbol] ?? NO_TICKS);
