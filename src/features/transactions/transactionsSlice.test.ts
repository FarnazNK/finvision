import { makeStore } from '@/app/store';
import {
  filterChanged,
  searchChanged,
  selectFilteredTransactions,
  transactionAdded,
} from '@/features/transactions/transactionsSlice';
import type { Transaction } from '@/types/domain';

const sample: Transaction[] = [
  { id: 'a', date: '2026-04-01T00:00:00Z', type: 'buy', symbol: 'AAPL', description: 'Buy 5 AAPL', amount: -800, currency: 'USD', status: 'settled' },
  { id: 'b', date: '2026-04-02T00:00:00Z', type: 'dividend', symbol: 'BND', description: 'BND dividend', amount: 22, currency: 'USD', status: 'settled' },
  { id: 'c', date: '2026-04-03T00:00:00Z', type: 'fee', description: 'Advisory fee', amount: -12, currency: 'USD', status: 'settled' },
];

function withTx() {
  return makeStore({
    transactions: { items: sample, filter: 'all', search: '' },
  });
}

describe('transactions selectors', () => {
  test('returns all items when filter is "all" and search is empty', () => {
    const store = withTx();
    expect(selectFilteredTransactions(store.getState())).toHaveLength(3);
  });

  test('filters by transaction type', () => {
    const store = withTx();
    store.dispatch(filterChanged('dividend'));
    const result = selectFilteredTransactions(store.getState());
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('b');
  });

  test('search matches symbol case-insensitively', () => {
    const store = withTx();
    store.dispatch(searchChanged('aapl'));
    const result = selectFilteredTransactions(store.getState());
    expect(result.map((t) => t.id)).toEqual(['a']);
  });

  test('search matches description text', () => {
    const store = withTx();
    store.dispatch(searchChanged('advisory'));
    const result = selectFilteredTransactions(store.getState());
    expect(result.map((t) => t.id)).toEqual(['c']);
  });

  test('filter and search compose with AND semantics', () => {
    const store = withTx();
    store.dispatch(filterChanged('buy'));
    store.dispatch(searchChanged('aapl'));
    expect(selectFilteredTransactions(store.getState()).map((t) => t.id)).toEqual(['a']);

    store.dispatch(searchChanged('bnd')); // no buy matches "bnd"
    expect(selectFilteredTransactions(store.getState())).toEqual([]);
  });
});

describe('transactionAdded reducer', () => {
  test('prepends the new transaction', () => {
    const store = withTx();
    const newTx: Transaction = {
      id: 'd', date: '2026-04-04T00:00:00Z', type: 'deposit',
      description: 'ACH deposit', amount: 500, currency: 'USD', status: 'pending',
    };
    store.dispatch(transactionAdded(newTx));
    expect(store.getState().transactions.items[0]).toEqual(newTx);
    expect(store.getState().transactions.items).toHaveLength(4);
  });
});
