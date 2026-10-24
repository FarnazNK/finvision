import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { createSelector } from '@reduxjs/toolkit';
import type { Transaction } from '@/types/domain';
import { seedTransactions } from '@/services/seed';
import type { RootState } from '@/app/store';

export type TxFilter = 'all' | Transaction['type'];

export interface TransactionsState {
  items: Transaction[];
  filter: TxFilter;
  search: string;
}

const initialState: TransactionsState = {
  items: seedTransactions,
  filter: 'all',
  search: '',
};

const transactionsSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {
    transactionAdded(state, action: PayloadAction<Transaction>) {
      state.items.unshift(action.payload);
    },
    filterChanged(state, action: PayloadAction<TxFilter>) {
      state.filter = action.payload;
    },
    searchChanged(state, action: PayloadAction<string>) {
      state.search = action.payload;
    },
  },
});

export const { transactionAdded, filterChanged, searchChanged } =
  transactionsSlice.actions;
export default transactionsSlice.reducer;

const NO_TRANSACTIONS: Transaction[] = [];

/**
 * The demo's sample activity. Accounts don't store transactions yet, so a
 * signed-in user sees none rather than demo activity beside their own holdings.
 */
export const selectTransactions = (s: RootState) =>
  s.portfolio.source === 'account' ? NO_TRANSACTIONS : s.transactions.items;
export const selectTxFilter = (s: RootState) => s.transactions.filter;
export const selectTxSearch = (s: RootState) => s.transactions.search;

export const selectFilteredTransactions = createSelector(
  [selectTransactions, selectTxFilter, selectTxSearch],
  (items, filter, search) => {
    const q = search.trim().toLowerCase();
    return newestFirst(items).filter((tx) => {
      if (filter !== 'all' && tx.type !== filter) return false;
      if (!q) return true;
      return (
        tx.description.toLowerCase().includes(q) ||
        tx.symbol?.toLowerCase().includes(q) ||
        tx.type.toLowerCase().includes(q)
      );
    });
  },
);

/** Newest activity first, regardless of the order it was recorded in. */
function newestFirst(items: Transaction[]): Transaction[] {
  return [...items].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
}

export const makeSelectRecentTransactions = (n: number) =>
  createSelector([selectTransactions], (items) => newestFirst(items).slice(0, n));
