import type { WatchlistItem } from '@/types/domain';
import { seedWatchlist } from '@/services/seed';
import type { Mutate, RootState } from '@/app/store';

export interface WatchlistState {
  items: WatchlistItem[];
}

export function initialWatchlistState(): WatchlistState {
  return { items: seedWatchlist };
}

export interface WatchlistActions {
  watchlistItemAdded: (item: Omit<WatchlistItem, 'addedAt'>) => void;
  watchlistItemRemoved: (symbol: string) => void;
}

export function createWatchlistActions(mutate: Mutate): WatchlistActions {
  return {
    watchlistItemAdded: (item) =>
      mutate(({ watchlist }) => {
        if (watchlist.items.some((i) => i.symbol === item.symbol)) return;
        watchlist.items.push({ ...item, addedAt: new Date().toISOString() });
      }),
    watchlistItemRemoved: (symbol) =>
      mutate(({ watchlist }) => {
        watchlist.items = watchlist.items.filter((i) => i.symbol !== symbol);
      }),
  };
}

export const selectWatchlist = (s: RootState) => s.watchlist.items;
