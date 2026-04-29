/**
 * Domain types for the wealth-management surface.
 *
 * Note on money: production fintech apps avoid `number` for money to dodge
 * floating-point rounding. Here we keep `number` for chart-friendliness, but
 * formatters always go through a single helper so a future swap to BigInt
 * cents is one-file-deep.
 */

export type AssetClass = 'equity' | 'fixed_income' | 'cash' | 'alternative' | 'crypto';

export interface Holding {
  id: string;
  symbol: string;
  name: string;
  assetClass: AssetClass;
  quantity: number;
  /** Per-share/unit cost basis in account currency. */
  costBasis: number;
  /** Latest mark, refreshed by the live feed. */
  price: number;
  /** Daily change as a decimal (0.012 = +1.2%). */
  dayChangePct: number;
  currency: string;
}

export interface Transaction {
  id: string;
  date: string; // ISO
  type: 'buy' | 'sell' | 'dividend' | 'deposit' | 'withdrawal' | 'fee';
  symbol?: string;
  description: string;
  amount: number;
  currency: string;
  status: 'settled' | 'pending' | 'failed';
}

/** Single point on the time-series for the equity curve. */
export interface PortfolioPoint {
  t: number; // unix ms
  value: number;
}

export interface MarketTick {
  symbol: string;
  price: number;
  changePct: number;
  t: number;
}

export interface WatchlistItem {
  symbol: string;
  name: string;
  addedAt: string;
}

export type ThemeMode = 'light' | 'dark' | 'system';
