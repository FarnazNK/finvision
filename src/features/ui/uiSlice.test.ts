import { makeStore } from '@/app/store';
import {
  liveFeedSet,
  liveFeedToggled,
  selectLiveFeed,
  selectSidebarCollapsed,
  selectThemeMode,
  sidebarToggled,
  themeModeChanged,
} from '@/features/ui/uiSlice';

describe('ui slice', () => {
  test('themeModeChanged updates the mode', () => {
    const store = makeStore();
    store.dispatch(themeModeChanged('dark'));
    expect(selectThemeMode(store.getState())).toBe('dark');
  });

  test('sidebarToggled flips the collapsed flag', () => {
    const store = makeStore();
    const before = selectSidebarCollapsed(store.getState());
    store.dispatch(sidebarToggled());
    expect(selectSidebarCollapsed(store.getState())).toBe(!before);
  });

  test('liveFeedToggled flips the boolean', () => {
    const store = makeStore();
    const before = selectLiveFeed(store.getState());
    store.dispatch(liveFeedToggled());
    expect(selectLiveFeed(store.getState())).toBe(!before);
  });

  test('liveFeedSet sets the explicit value', () => {
    const store = makeStore();
    store.dispatch(liveFeedSet(false));
    expect(selectLiveFeed(store.getState())).toBe(false);
    store.dispatch(liveFeedSet(true));
    expect(selectLiveFeed(store.getState())).toBe(true);
  });
});
