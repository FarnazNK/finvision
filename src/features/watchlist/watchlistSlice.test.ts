import { makeStore } from '@/app/store';
import {
  selectWatchlist,
  } from '@/features/watchlist/watchlistSlice';

function blankStore() {
  return makeStore({
    watchlist: { items: [] },
  });
}

describe('watchlist action', () => {
  test('watchlistItemAdded inserts a new item with addedAt populated', () => {
    const store = blankStore();
    store.getState().watchlistItemAdded({ symbol: 'NVDA', name: 'NVIDIA' });
    const items = selectWatchlist(store.getState());
    expect(items).toHaveLength(1);
    expect(items[0].symbol).toBe('NVDA');
    expect(items[0].name).toBe('NVIDIA');
    expect(typeof items[0].addedAt).toBe('string');
    expect(Number.isNaN(Date.parse(items[0].addedAt))).toBe(false);
  });

  test('watchlistItemAdded ignores duplicate symbols', () => {
    const store = blankStore();
    store.getState().watchlistItemAdded({ symbol: 'NVDA', name: 'NVIDIA' });
    store.getState().watchlistItemAdded({ symbol: 'NVDA', name: 'Should not replace' });
    const items = selectWatchlist(store.getState());
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('NVIDIA');
  });

  test('watchlistItemRemoved drops the matching symbol', () => {
    const store = blankStore();
    store.getState().watchlistItemAdded({ symbol: 'NVDA', name: 'NVIDIA' });
    store.getState().watchlistItemAdded({ symbol: 'TSLA', name: 'Tesla' });
    store.getState().watchlistItemRemoved('NVDA');
    const items = selectWatchlist(store.getState());
    expect(items.map((i) => i.symbol)).toEqual(['TSLA']);
  });
});
