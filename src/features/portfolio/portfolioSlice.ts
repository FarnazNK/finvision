import { createAsyncThunk, createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from '@reduxjs/toolkit';
import type { Holding, MarketTick, PortfolioPoint } from '@/types/domain';
import { seedHoldings, seedPortfolioCurve } from '@/services/seed';
import {
  createHolding,
  deleteHolding,
  fetchAccountSnapshot,
  type AccountSnapshot,
  type NewHolding,
  type PriceSource,
} from '@/services/portfolioClient';
import type { RootState } from '@/app/store';

/**
 * `demo`: the public sample portfolio with simulated prices (signed out).
 * `account`: the signed-in user's saved holdings, priced by the server.
 */
export type PortfolioSource = 'demo' | 'account';

export interface PortfolioState {
  source: PortfolioSource;
  holdings: Holding[];
  curve: PortfolioPoint[];
  /** ISO timestamp of the last price update, used by header status pill. */
  lastUpdated: string | null;
  /** Where account prices came from; null in demo mode. */
  priceSource: PriceSource | null;
  loading: boolean;
  error: string | null;
}

export const initialPortfolioState: PortfolioState = {
  source: 'demo',
  holdings: seedHoldings,
  curve: seedPortfolioCurve(),
  lastUpdated: new Date().toISOString(),
  priceSource: null,
  loading: false,
  error: null,
};

function errorMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : 'Something went wrong';
}

/** Load the signed-in user's server-priced snapshot. */
export const loadAccountPortfolio = createAsyncThunk<AccountSnapshot, void, { rejectValue: string }>(
  'portfolio/loadAccount',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchAccountSnapshot();
    } catch (reason) {
      return rejectWithValue(errorMessage(reason));
    }
  },
);

/** Save a holding, then reload so the server stays the source of truth. */
export const addAccountHolding = createAsyncThunk<AccountSnapshot, NewHolding, { rejectValue: string }>(
  'portfolio/addHolding',
  async (holding, { rejectWithValue }) => {
    try {
      await createHolding(holding);
      return await fetchAccountSnapshot();
    } catch (reason) {
      return rejectWithValue(errorMessage(reason));
    }
  },
);

export const removeAccountHolding = createAsyncThunk<AccountSnapshot, string, { rejectValue: string }>(
  'portfolio/removeHolding',
  async (id, { rejectWithValue }) => {
    try {
      await deleteHolding(id);
      return await fetchAccountSnapshot();
    } catch (reason) {
      return rejectWithValue(errorMessage(reason));
    }
  },
);

function applySnapshot(state: PortfolioState, snapshot: AccountSnapshot) {
  const now = Date.now();
  state.source = 'account';
  state.holdings = snapshot.holdings;
  state.priceSource = snapshot.priceSource;
  // No price history is stored yet, so the curve starts at today's value.
  const value = snapshot.holdings.reduce((sum, h) => sum + h.quantity * h.price, 0);
  state.curve = [{ t: now, value }];
  state.lastUpdated = new Date(now).toISOString();
  state.loading = false;
  state.error = null;
}

function restoreDemo(state: PortfolioState) {
  state.source = 'demo';
  state.holdings = seedHoldings;
  state.curve = seedPortfolioCurve();
  state.priceSource = null;
  state.lastUpdated = new Date().toISOString();
  state.loading = false;
  state.error = null;
}

const portfolioSlice = createSlice({
  name: 'portfolio',
  initialState: initialPortfolioState,
  reducers: {
    holdingsRepriced(state, action: PayloadAction<MarketTick[]>) {
      // Simulated ticks only apply to the demo; account prices come from the server.
      if (state.source === 'account') return;
      const bySymbol = new Map(action.payload.map((t) => [t.symbol, t]));
      for (const h of state.holdings) {
        const tick = bySymbol.get(h.symbol);
        if (!tick) continue;
        const dayFactor = 1 + h.dayChangePct;
        const prevDayBase = dayFactor > 0 ? h.price / dayFactor : h.price;
        h.price = tick.price;
        h.dayChangePct = (tick.price - prevDayBase) / prevDayBase;
      }
      state.lastUpdated = new Date().toISOString();
    },
    curvePointAppended(state, action: PayloadAction<PortfolioPoint>) {
      if (state.source === 'account') return;
      state.curve.push(action.payload);
      // Keep only ~2 years of points to bound memory.
      if (state.curve.length > 800) state.curve.shift();
    },
    /** Back to the public demo portfolio (also used on sign-out). */
    portfolioReset(state) {
      restoreDemo(state);
    },
  },
  extraReducers: (builder) => {
    for (const thunk of [loadAccountPortfolio, addAccountHolding, removeAccountHolding]) {
      builder
        .addCase(thunk.pending, (state) => {
          state.loading = true;
          state.error = null;
        })
        .addCase(thunk.fulfilled, (state, action) => {
          applySnapshot(state, action.payload);
        })
        .addCase(thunk.rejected, (state, action) => {
          state.loading = false;
          state.error = action.payload ?? 'Something went wrong';
        });
    }
  },
});

export const { holdingsRepriced, curvePointAppended, portfolioReset } =
  portfolioSlice.actions;
export default portfolioSlice.reducer;

// ---------- Selectors ----------
// Memoized selectors keep derived computations off the render path.

export const selectHoldings = (s: RootState) => s.portfolio.holdings;
export const selectCurve = (s: RootState) => s.portfolio.curve;
export const selectLastUpdated = (s: RootState) => s.portfolio.lastUpdated;
export const selectPortfolioSource = (s: RootState) => s.portfolio.source;
export const selectIsAccountPortfolio = (s: RootState) => s.portfolio.source === 'account';
export const selectPriceSource = (s: RootState) => s.portfolio.priceSource;
export const selectPortfolioLoading = (s: RootState) => s.portfolio.loading;
export const selectPortfolioError = (s: RootState) => s.portfolio.error;

export const selectTotalValue = createSelector([selectHoldings], (holdings) =>
  holdings.reduce((sum, h) => sum + h.quantity * h.price, 0),
);

export const selectTotalCostBasis = createSelector([selectHoldings], (holdings) =>
  holdings.reduce((sum, h) => sum + h.quantity * h.costBasis, 0),
);

export const selectTotalGain = createSelector(
  [selectTotalValue, selectTotalCostBasis],
  (value, cost) => value - cost,
);

export const selectTotalGainPct = createSelector(
  [selectTotalGain, selectTotalCostBasis],
  (gain, cost) => (cost > 0 ? gain / cost : 0),
);

export const selectDayChange = createSelector([selectHoldings], (holdings) =>
  holdings.reduce((sum, h) => {
    const prevValue = (h.quantity * h.price) / (1 + h.dayChangePct);
    return sum + (h.quantity * h.price - prevValue);
  }, 0),
);

export const selectDayChangePct = createSelector(
  [selectDayChange, selectTotalValue],
  (dayChange, total) => (total > 0 ? dayChange / total : 0),
);

/** Allocation by asset class — feeds the donut/treemap. */
export const selectAllocationByAssetClass = createSelector(
  [selectHoldings, selectTotalValue],
  (holdings, total) => {
    if (total === 0) return [];
    const buckets = new Map<string, number>();
    for (const h of holdings) {
      const v = h.quantity * h.price;
      buckets.set(h.assetClass, (buckets.get(h.assetClass) ?? 0) + v);
    }
    return Array.from(buckets.entries())
      .map(([assetClass, value]) => ({
        assetClass,
        value,
        weight: value / total,
      }))
      .sort((a, b) => b.value - a.value);
  },
);

export const selectHoldingsCount = createSelector(
  [selectHoldings],
  (holdings) => holdings.length,
);

/** Top holdings sorted by market value, capped to N. */
export const makeSelectTopHoldings = (n: number) =>
  createSelector([selectHoldings], (holdings) =>
    [...holdings]
      .sort((a, b) => b.quantity * b.price - a.quantity * a.price)
      .slice(0, n),
  );
