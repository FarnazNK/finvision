import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from '@reduxjs/toolkit';
import type { Holding, MarketTick, PortfolioPoint } from '@/types/domain';
import { seedHoldings, seedPortfolioCurve } from '@/services/seed';
import type { RootState } from '@/app/store';

export interface PortfolioState {
  holdings: Holding[];
  curve: PortfolioPoint[];
  /** ISO timestamp of the last price update, used by header status pill. */
  lastUpdated: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: PortfolioState = {
  holdings: seedHoldings,
  curve: seedPortfolioCurve(),
  lastUpdated: new Date().toISOString(),
  loading: false,
  error: null,
};

const portfolioSlice = createSlice({
  name: 'portfolio',
  initialState,
  reducers: {
    holdingsRepriced(state, action: PayloadAction<MarketTick[]>) {
      const bySymbol = new Map(action.payload.map((t) => [t.symbol, t]));
      for (const h of state.holdings) {
        const tick = bySymbol.get(h.symbol);
        if (!tick) continue;
        const prevDayBase = h.price / (1 + h.dayChangePct);
        h.price = tick.price;
        h.dayChangePct = (tick.price - prevDayBase) / prevDayBase;
      }
      state.lastUpdated = new Date().toISOString();
    },
    curvePointAppended(state, action: PayloadAction<PortfolioPoint>) {
      state.curve.push(action.payload);
      // Keep only ~2 years of points to bound memory.
      if (state.curve.length > 800) state.curve.shift();
    },
    portfolioReset(state) {
      state.holdings = seedHoldings;
      state.curve = seedPortfolioCurve();
      state.lastUpdated = new Date().toISOString();
      state.error = null;
    },
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
