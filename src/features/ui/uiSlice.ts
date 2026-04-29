import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ThemeMode } from '@/types/domain';
import type { RootState } from '@/app/store';

export interface UIState {
  themeMode: ThemeMode;
  sidebarCollapsed: boolean;
  liveFeed: boolean;
  /** ISO 4217 currency for display formatting. */
  currency: string;
}

const initialState: UIState = {
  themeMode: 'system',
  sidebarCollapsed: false,
  liveFeed: true,
  currency: 'USD',
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    themeModeChanged(state, action: PayloadAction<ThemeMode>) {
      state.themeMode = action.payload;
    },
    themeHydrated(state, action: PayloadAction<ThemeMode>) {
      state.themeMode = action.payload;
    },
    sidebarToggled(state) {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    liveFeedToggled(state) {
      state.liveFeed = !state.liveFeed;
    },
    liveFeedSet(state, action: PayloadAction<boolean>) {
      state.liveFeed = action.payload;
    },
    currencyChanged(state, action: PayloadAction<string>) {
      state.currency = action.payload;
    },
  },
});

export const {
  themeModeChanged,
  themeHydrated,
  sidebarToggled,
  liveFeedToggled,
  liveFeedSet,
  currencyChanged,
} = uiSlice.actions;
export default uiSlice.reducer;

export const selectThemeMode = (s: RootState) => s.ui.themeMode;
export const selectSidebarCollapsed = (s: RootState) => s.ui.sidebarCollapsed;
export const selectLiveFeed = (s: RootState) => s.ui.liveFeed;
export const selectCurrency = (s: RootState) => s.ui.currency;
