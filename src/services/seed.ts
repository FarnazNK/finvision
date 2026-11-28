import type {
  Holding,
  PortfolioPoint,
  Transaction,
  WatchlistItem,
} from '@/types/domain';
import { simulateHistory } from '@/services/priceModel';

export const seedHoldings: Holding[] = [
  {
    id: 'h_1',
    symbol: 'VTI',
    name: 'Vanguard Total Stock Market ETF',
    assetClass: 'equity',
    quantity: 142,
    costBasis: 198.4,
    price: 246.1,
    dayChangePct: 0.0084,
    currency: 'USD',
  },
  {
    id: 'h_2',
    symbol: 'VXUS',
    name: 'Vanguard Total International Stock ETF',
    assetClass: 'equity',
    quantity: 86,
    costBasis: 56.2,
    price: 64.83,
    dayChangePct: -0.0021,
    currency: 'USD',
  },
  {
    id: 'h_3',
    symbol: 'BND',
    name: 'Vanguard Total Bond Market ETF',
    assetClass: 'fixed_income',
    quantity: 220,
    costBasis: 76.4,
    price: 73.95,
    dayChangePct: 0.0011,
    currency: 'USD',
  },
  {
    id: 'h_4',
    symbol: 'AAPL',
    name: 'Apple Inc.',
    assetClass: 'equity',
    quantity: 35,
    costBasis: 148.0,
    price: 198.4,
    dayChangePct: 0.0123,
    currency: 'USD',
  },
  {
    id: 'h_5',
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    assetClass: 'equity',
    quantity: 22,
    costBasis: 280.0,
    price: 412.6,
    dayChangePct: 0.0056,
    currency: 'USD',
  },
  {
    id: 'h_6',
    symbol: 'GLD',
    name: 'SPDR Gold Shares',
    assetClass: 'alternative',
    quantity: 18,
    costBasis: 165.0,
    price: 215.4,
    dayChangePct: -0.0042,
    currency: 'USD',
  },
  {
    id: 'h_7',
    symbol: 'CASH',
    name: 'Cash & Equivalents',
    assetClass: 'cash',
    quantity: 12500,
    costBasis: 1,
    price: 1,
    dayChangePct: 0,
    currency: 'USD',
  },
];

/**
 * Seeded market state for the demo: a one-year daily history from the
 * correlated price model (see priceModel.ts), with each holding's day change
 * taken from the last day of that same history so every number agrees.
 */
export function seedMarket(end = Date.now()): { holdings: Holding[]; curve: PortfolioPoint[] } {
  const history = simulateHistory(seedHoldings, { end });
  return {
    holdings: seedHoldings.map((h, i) => ({ ...h, dayChangePct: history.dayChangePct[i] })),
    curve: history.curve,
  };
}

/** Headline figures for the landing page, from the same model as the dashboard. */
export function demoHeadline(end = Date.now()): {
  value: number;
  pastYearPct: number;
  largestWeight: number;
} {
  const { holdings, curve } = seedMarket(end);
  const values = holdings.map((h) => h.quantity * h.price);
  const value = values.reduce((a, b) => a + b, 0);
  const first = curve[0]?.value ?? value;
  return {
    value,
    pastYearPct: first > 0 ? value / first - 1 : 0,
    largestWeight: value > 0 ? Math.max(...values) / value : 0,
  };
}

/** One year of daily portfolio values (252 trading days). */
export function seedPortfolioCurve(end = Date.now()): PortfolioPoint[] {
  return simulateHistory(seedHoldings, { end }).curve;
}

export const seedTransactions: Transaction[] = [
  { id: 't_1', date: isoDaysAgo(1), type: 'buy', symbol: 'VTI', description: 'Buy 4 VTI', amount: -984.4, currency: 'USD', status: 'settled' },
  { id: 't_2', date: isoDaysAgo(3), type: 'dividend', symbol: 'BND', description: 'BND quarterly dividend', amount: 41.22, currency: 'USD', status: 'settled' },
  { id: 't_3', date: isoDaysAgo(7), type: 'deposit', description: 'ACH from Checking ••4421', amount: 2500, currency: 'USD', status: 'settled' },
  { id: 't_4', date: isoDaysAgo(11), type: 'sell', symbol: 'AAPL', description: 'Sell 5 AAPL', amount: 992.0, currency: 'USD', status: 'settled' },
  { id: 't_5', date: isoDaysAgo(14), type: 'fee', description: 'Advisory fee', amount: -19.5, currency: 'USD', status: 'settled' },
  { id: 't_6', date: isoDaysAgo(0), type: 'buy', symbol: 'MSFT', description: 'Buy 2 MSFT', amount: -825.2, currency: 'USD', status: 'pending' },
  { id: 't_7', date: isoDaysAgo(21), type: 'dividend', symbol: 'VTI', description: 'VTI quarterly dividend', amount: 87.4, currency: 'USD', status: 'settled' },
  { id: 't_8', date: isoDaysAgo(28), type: 'withdrawal', description: 'ACH to Checking ••4421', amount: -1500, currency: 'USD', status: 'settled' },
];

export const seedWatchlist: WatchlistItem[] = [
  { symbol: 'NVDA', name: 'NVIDIA Corporation', addedAt: isoDaysAgo(40) },
  { symbol: 'TSLA', name: 'Tesla, Inc.', addedAt: isoDaysAgo(60) },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', addedAt: isoDaysAgo(15) },
  { symbol: 'BRK.B', name: 'Berkshire Hathaway', addedAt: isoDaysAgo(90) },
];

function isoDaysAgo(d: number): string {
  return new Date(Date.now() - d * 86_400_000).toISOString();
}
