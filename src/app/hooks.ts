import { useStore } from 'zustand';
import { store, type RootState } from './store';

/**
 * Subscribe a component to part of the app store.
 *
 * The component re-renders only when the selected value changes (by
 * reference), so select the smallest slice you need and use the memoized
 * selectors for derived data.
 */
export function useAppStore<T>(selector: (state: RootState) => T): T {
  return useStore(store, selector);
}
