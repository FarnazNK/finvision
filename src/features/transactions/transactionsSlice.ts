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

export const selectTransactions = (s: RootState) => s.transactions.items;
export const selectTxFilter = (s: RootState) => s.transactions.filter;
export const selectTxSearch = (s: RootState) => s.transactions.search;

export const selectFilteredTransactions = createSelector(
  [selectTransactions, selectTxFilter, selectTxSearch],
  (items, filter, search) => {
    const q = search.trim().toLowerCase();
    return items.filter((tx) => {
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
