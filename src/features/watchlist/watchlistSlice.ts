import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { WatchlistItem } from '@/types/domain';
import { seedWatchlist } from '@/services/seed';
import type { RootState } from '@/app/store';

export interface WatchlistState {
  items: WatchlistItem[];
}

const initialState: WatchlistState = { items: seedWatchlist };

const watchlistSlice = createSlice({
  name: 'watchlist',
  initialState,
  reducers: {
    watchlistItemAdded: {
      reducer(state, action: PayloadAction<WatchlistItem>) {
        if (state.items.some((i) => i.symbol === action.payload.symbol)) return;
        state.items.push(action.payload);
      },
      prepare(item: Omit<WatchlistItem, 'addedAt'>) {
        return { payload: { ...item, addedAt: new Date().toISOString() } };
      },
    },
    watchlistItemRemoved(state, action: PayloadAction<string>) {
      state.items = state.items.filter((i) => i.symbol !== action.payload);
    },
  },
});

export const { watchlistItemAdded, watchlistItemRemoved } =
  watchlistSlice.actions;
export default watchlistSlice.reducer;

export const selectWatchlist = (s: RootState) => s.watchlist.items;
