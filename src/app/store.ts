import { combineReducers, configureStore, type Middleware } from '@reduxjs/toolkit';
import portfolioReducer from '@/features/portfolio/portfolioSlice';
import marketsReducer from '@/features/markets/marketsSlice';
import transactionsReducer from '@/features/transactions/transactionsSlice';
import watchlistReducer from '@/features/watchlist/watchlistSlice';
import uiReducer from '@/features/ui/uiSlice';

declare const __FINVISION_DEV__: boolean | undefined;
const isDev =
  typeof __FINVISION_DEV__ !== 'undefined'
    ? __FINVISION_DEV__
    : typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';
/**
 * Lightweight perf-aware logger — prints actions in dev, opt-out via env.
 * Real apps reach for redux-logger; this avoids the dependency.
 */
const devLogger: Middleware = () => (next) => (action) => {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.debug('[redux]', (action as { type?: string }).type);
  }
  return next(action);
};

const rootReducer = combineReducers({
  portfolio: portfolioReducer,
  markets: marketsReducer,
  transactions: transactionsReducer,
  watchlist: watchlistReducer,
  ui: uiReducer,
});

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefault) => getDefault().concat(devLogger),
  devTools: isDev,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

/** For tests — returns a fresh store with the same shape. */
export function makeStore(preloaded?: Partial<RootState>) {
  return configureStore({
    reducer: rootReducer,
    preloadedState: preloaded as RootState | undefined,
  });
}
