import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from '@reduxjs/toolkit';
import type { MarketTick } from '@/types/domain';
import type { RootState } from '@/app/store';

export interface MarketsState {
  /** Per-symbol rolling tick history, capped per symbol. */
  history: Record<string, MarketTick[]>;
  /** Last tick processed (for "last update" UI). */
  lastTickAt: number | null;
}

const HISTORY_CAP = 60;

const initialState: MarketsState = {
  history: {},
  lastTickAt: null,
};

const marketsSlice = createSlice({
  name: 'markets',
  initialState,
  reducers: {
    tickReceived(state, action: PayloadAction<MarketTick[]>) {
      for (const tick of action.payload) {
        const existing = state.history[tick.symbol] ?? [];
        existing.push(tick);
        if (existing.length > HISTORY_CAP) existing.shift();
        state.history[tick.symbol] = existing;
      }
      state.lastTickAt = Date.now();
    },
    historyCleared(state) {
      state.history = {};
      state.lastTickAt = null;
    },
  },
});

export const { tickReceived, historyCleared } = marketsSlice.actions;
export default marketsSlice.reducer;

// ---------- Selectors ----------

export const selectMarketHistory = (s: RootState) => s.markets.history;
export const selectLastTickAt = (s: RootState) => s.markets.lastTickAt;

export const makeSelectSparkline = (symbol: string) =>
  createSelector([selectMarketHistory], (h) => h[symbol] ?? []);
