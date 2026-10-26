import type { Transaction } from '@/types/domain';
import { seedTransactions } from '@/services/seed';
import type { Mutate, RootState } from '@/app/store';
import { createSelector } from '@/app/createSelector';

export type TxFilter = 'all' | Transaction['type'];

export interface TransactionsState {
  items: Transaction[];
  filter: TxFilter;
  search: string;
}

export function initialTransactionsState(): TransactionsState {
  return { items: seedTransactions, filter: 'all', search: '' };
}

export interface TransactionsActions {
  transactionAdded: (tx: Transaction) => void;
  filterChanged: (filter: TxFilter) => void;
  searchChanged: (search: string) => void;
}

export function createTransactionsActions(mutate: Mutate): TransactionsActions {
  return {
    transactionAdded: (tx) =>
      mutate(({ transactions }) => {
        transactions.items.unshift(tx);
      }),
    filterChanged: (filter) =>
      mutate(({ transactions }) => {
        transactions.filter = filter;
      }),
    searchChanged: (search) =>
      mutate(({ transactions }) => {
        transactions.search = search;
      }),
  };
}

export const selectTransactions = (s: RootState) => s.transactions.items;
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
