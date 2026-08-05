import { configureStore, type Middleware } from '@reduxjs/toolkit';
import portfolioReducer from '@/features/portfolio/portfolioSlice';
import marketsReducer from '@/features/markets/marketsSlice';
import transactionsReducer from '@/features/transactions/transactionsSlice';
import watchlistReducer from '@/features/watchlist/watchlistSlice';
import uiReducer from '@/features/ui/uiSlice';

// Vite injects `process.env.NODE_ENV` at build time; Jest sets it to "test".
// We use this instead of `import.meta.env` so the same module compiles cleanly
// under both Vite (ESM) and ts-jest (CommonJS).
const isDev =
  typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';

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

export const store = configureStore({
  reducer: {
    portfolio: portfolioReducer,
    markets: marketsReducer,
    transactions: transactionsReducer,
    watchlist: watchlistReducer,
    ui: uiReducer,
  },
  middleware: (getDefault) => getDefault().concat(devLogger),
  devTools: isDev,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

/** For tests — returns a fresh store with the same shape. */
export function makeStore(preloaded?: Partial<RootState>) {
  return configureStore({
    reducer: {
      portfolio: portfolioReducer,
      markets: marketsReducer,
      transactions: transactionsReducer,
      watchlist: watchlistReducer,
      ui: uiReducer,
    },
    preloadedState: preloaded as RootState | undefined,
  });
}
