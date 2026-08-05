import { makeStore } from '@/app/store';
import {
  holdingsRepriced,
  portfolioReset,
  selectAllocationByAssetClass,
  selectDayChange,
  selectHoldingsCount,
  selectTotalCostBasis,
  selectTotalGain,
  selectTotalGainPct,
  selectTotalValue,
} from '@/features/portfolio/portfolioSlice';
import type { Holding, MarketTick } from '@/types/domain';

const baseHoldings: Holding[] = [
  {
    id: '1', symbol: 'AAA', name: 'Alpha', assetClass: 'equity',
    quantity: 10, costBasis: 100, price: 120, dayChangePct: 0.02, currency: 'USD',
  },
  {
    id: '2', symbol: 'BBB', name: 'Beta', assetClass: 'fixed_income',
    quantity: 50, costBasis: 80, price: 78, dayChangePct: -0.005, currency: 'USD',
  },
  {
    id: '3', symbol: 'CASH', name: 'Cash', assetClass: 'cash',
    quantity: 1000, costBasis: 1, price: 1, dayChangePct: 0, currency: 'USD',
  },
];

function withHoldings(): ReturnType<typeof makeStore> {
  return makeStore({
    portfolio: {
      holdings: baseHoldings,
      curve: [],
      lastUpdated: null,
      loading: false,
      error: null,
    },
  });
}

describe('portfolio selectors', () => {
  test('selectTotalValue sums quantity × price across all holdings', () => {
    const store = withHoldings();
    // 10*120 + 50*78 + 1000*1 = 1200 + 3900 + 1000 = 6100
    expect(selectTotalValue(store.getState())).toBe(6100);
  });

  test('selectTotalCostBasis sums quantity × costBasis', () => {
    const store = withHoldings();
    // 10*100 + 50*80 + 1000*1 = 1000 + 4000 + 1000 = 6000
    expect(selectTotalCostBasis(store.getState())).toBe(6000);
  });

  test('selectTotalGain is value minus cost basis', () => {
    const store = withHoldings();
    expect(selectTotalGain(store.getState())).toBe(100);
  });

  test('selectTotalGainPct divides gain by cost basis', () => {
    const store = withHoldings();
    expect(selectTotalGainPct(store.getState())).toBeCloseTo(100 / 6000, 6);
  });

  test('selectTotalGainPct is 0 when cost basis is 0', () => {
    const store = makeStore({
      portfolio: {
        holdings: [],
        curve: [],
        lastUpdated: null,
        loading: false,
        error: null,
      },
    });
    expect(selectTotalGainPct(store.getState())).toBe(0);
  });

  test('selectDayChange computes the day delta from dayChangePct', () => {
    const store = withHoldings();
    // For AAA: prevValue = 1200/1.02 ≈ 1176.47; delta ≈ 23.53
    // For BBB: prevValue = 3900/0.995 ≈ 3919.598; delta ≈ -19.598
    // For cash: 0
    const dayChange = selectDayChange(store.getState());
    expect(dayChange).toBeCloseTo(23.529 + -19.598, 1);
  });

  test('selectAllocationByAssetClass groups and sorts by value desc', () => {
    const store = withHoldings();
    const alloc = selectAllocationByAssetClass(store.getState());
    expect(alloc.map((a) => a.assetClass)).toEqual(['fixed_income', 'equity', 'cash']);
    const total = alloc.reduce((s, a) => s + a.value, 0);
    expect(total).toBe(6100);
    expect(alloc.reduce((s, a) => s + a.weight, 0)).toBeCloseTo(1, 6);
  });

  test('selectAllocationByAssetClass is empty when total is zero', () => {
    const store = makeStore({
      portfolio: {
        holdings: [],
        curve: [],
        lastUpdated: null,
        loading: false,
        error: null,
      },
    });
    expect(selectAllocationByAssetClass(store.getState())).toEqual([]);
  });

  test('selectHoldingsCount returns the number of holdings', () => {
    const store = withHoldings();
    expect(selectHoldingsCount(store.getState())).toBe(3);
  });
});

describe('holdingsRepriced reducer', () => {
  test('updates price for matched ticks and recomputes dayChangePct', () => {
    const store = withHoldings();
    const ticks: MarketTick[] = [
      { symbol: 'AAA', price: 132, changePct: 0, t: Date.now() },
    ];
    store.dispatch(holdingsRepriced(ticks));
    const aaa = store.getState().portfolio.holdings.find((h) => h.symbol === 'AAA')!;
    expect(aaa.price).toBe(132);
    // prevDayBase was 120/1.02 ≈ 117.647; new pct ≈ (132-117.647)/117.647
    expect(aaa.dayChangePct).toBeCloseTo((132 - 120 / 1.02) / (120 / 1.02), 6);
  });

  test('ignores ticks for unknown symbols', () => {
    const store = withHoldings();
    const before = store.getState().portfolio.holdings;
    store.dispatch(holdingsRepriced([{ symbol: 'ZZZ', price: 999, changePct: 0, t: Date.now() }]));
    expect(store.getState().portfolio.holdings).toEqual(before);
  });

  test('sets lastUpdated to a recent ISO timestamp', () => {
    const store = withHoldings();
    store.dispatch(holdingsRepriced([{ symbol: 'AAA', price: 121, changePct: 0, t: Date.now() }]));
    const updated = store.getState().portfolio.lastUpdated;
    expect(updated).not.toBeNull();
    expect(new Date(updated!).getTime()).toBeLessThanOrEqual(Date.now());
  });
});

describe('portfolioReset reducer', () => {
  test('restores seed data and clears errors', () => {
    const store = withHoldings();
    store.dispatch(portfolioReset());
    const state = store.getState().portfolio;
    expect(state.holdings.length).toBeGreaterThan(0);
    expect(state.error).toBeNull();
  });
});
