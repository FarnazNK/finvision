import type { MarketTick } from '@/types/domain';
import type { Mutate, RootState } from '@/app/store';
import { createSelector } from '@/app/createSelector';

export interface MarketsState {
  /** Per-symbol rolling tick history, capped per symbol. */
  history: Record<string, MarketTick[]>;
  /** Last tick processed (for "last update" UI). */
  lastTickAt: number | null;
}

const HISTORY_CAP = 60;

export function initialMarketsState(): MarketsState {
  return { history: {}, lastTickAt: null };
}

export interface MarketsActions {
  tickReceived: (ticks: MarketTick[]) => void;
  historyCleared: () => void;
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
  };
}

// ---------- Selectors ----------

export const selectMarketHistory = (s: RootState) => s.markets.history;
export const selectLastTickAt = (s: RootState) => s.markets.lastTickAt;

const NO_TICKS: MarketTick[] = [];

export const makeSelectSparkline = (symbol: string) =>
  createSelector([selectMarketHistory], (h) => h[symbol] ?? NO_TICKS);
