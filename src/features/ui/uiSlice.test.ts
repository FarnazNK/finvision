import { makeStore } from '@/app/store';
import {
  selectLiveFeed,
  selectSidebarCollapsed,
  selectThemeMode,
  } from '@/features/ui/uiSlice';

describe('ui slice', () => {
  test('defaults to the dark glass theme', () => {
    expect(selectThemeMode(makeStore().getState())).toBe('dark');
  });

  test('themeModeChanged updates the mode', () => {
    const store = makeStore();
    store.getState().themeModeChanged('light');
    expect(selectThemeMode(store.getState())).toBe('light');
  });

  test('sidebarToggled flips the collapsed flag', () => {
    const store = makeStore();
    const before = selectSidebarCollapsed(store.getState());
    store.getState().sidebarToggled();
    expect(selectSidebarCollapsed(store.getState())).toBe(!before);
  });

  test('liveFeedToggled flips the boolean', () => {
    const store = makeStore();
    const before = selectLiveFeed(store.getState());
    store.getState().liveFeedToggled();
    expect(selectLiveFeed(store.getState())).toBe(!before);
  });

  test('liveFeedSet sets the explicit value', () => {
    const store = makeStore();
    store.getState().liveFeedSet(false);
    expect(selectLiveFeed(store.getState())).toBe(false);
    store.getState().liveFeedSet(true);
    expect(selectLiveFeed(store.getState())).toBe(true);
  });
});
