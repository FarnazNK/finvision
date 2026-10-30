import type { ThemeMode } from '@/types/domain';
import type { Mutate, RootState } from '@/app/store';

export interface UIState {
  themeMode: ThemeMode;
  sidebarCollapsed: boolean;
  liveFeed: boolean;
  /** ISO 4217 currency for display formatting. */
  currency: string;
}

export function initialUIState(): UIState {
  return {
    themeMode: 'dark',
    sidebarCollapsed: false,
    liveFeed: true,
    currency: 'USD',
  };
}

export interface UIActions {
  themeModeChanged: (mode: ThemeMode) => void;
  themeHydrated: (mode: ThemeMode) => void;
  sidebarToggled: () => void;
  liveFeedToggled: () => void;
  liveFeedSet: (on: boolean) => void;
  currencyChanged: (currency: string) => void;
}

export function createUIActions(mutate: Mutate): UIActions {
  return {
    themeModeChanged: (mode) =>
      mutate(({ ui }) => {
        ui.themeMode = mode;
      }),
    themeHydrated: (mode) =>
      mutate(({ ui }) => {
        ui.themeMode = mode;
      }),
    sidebarToggled: () =>
      mutate(({ ui }) => {
        ui.sidebarCollapsed = !ui.sidebarCollapsed;
      }),
    liveFeedToggled: () =>
      mutate(({ ui }) => {
        ui.liveFeed = !ui.liveFeed;
      }),
    liveFeedSet: (on) =>
      mutate(({ ui }) => {
        ui.liveFeed = on;
      }),
    currencyChanged: (currency) =>
      mutate(({ ui }) => {
        ui.currency = currency;
      }),
  };
}

export const selectThemeMode = (s: RootState) => s.ui.themeMode;
export const selectSidebarCollapsed = (s: RootState) => s.ui.sidebarCollapsed;
export const selectLiveFeed = (s: RootState) => s.ui.liveFeed;
export const selectCurrency = (s: RootState) => s.ui.currency;
