/**
 * App state, held in a single Zustand store composed from feature slices.
 *
 * Each feature (portfolio, markets, transactions, watchlist, ui) owns its data
 * shape, initial state, actions and selectors in its own file; this module
 * stitches them together. Actions update state through immer's `produce`, so
 * the update logic reads as plain mutations while state stays immutable.
 *
 * The store is a vanilla Zustand store so non-React code (the market feed,
 * tests) can read and update it directly; components subscribe through
 * `useAppStore` in ./hooks.
 */
import { createStore, type StoreApi } from 'zustand/vanilla';
import { produce } from 'immer';
import {
  createPortfolioActions,
  initialPortfolioState,
  type PortfolioActions,
  type PortfolioState,
} from '@/features/portfolio/portfolioSlice';
import {
  createMarketsActions,
  initialMarketsState,
  type MarketsActions,
  type MarketsState,
} from '@/features/markets/marketsSlice';
import {
  createTransactionsActions,
  initialTransactionsState,
  type TransactionsActions,
  type TransactionsState,
} from '@/features/transactions/transactionsSlice';
import {
  createWatchlistActions,
  initialWatchlistState,
  type WatchlistActions,
  type WatchlistState,
} from '@/features/watchlist/watchlistSlice';
import {
  createUIActions,
  initialUIState,
  type UIActions,
  type UIState,
} from '@/features/ui/uiSlice';

export interface AppData {
  portfolio: PortfolioState;
  markets: MarketsState;
  transactions: TransactionsState;
  watchlist: WatchlistState;
  ui: UIState;
}

export type AppActions = PortfolioActions &
  MarketsActions &
  TransactionsActions &
  WatchlistActions &
  UIActions;

export type RootState = AppData & AppActions;
export type AppStore = StoreApi<RootState>;

/** Applies an immer recipe to the store's data. */
export type Mutate = (recipe: (draft: AppData) => void) => void;

const DATA_KEYS = ['portfolio', 'markets', 'transactions', 'watchlist', 'ui'] as const;
const STORAGE_KEY = 'finvision-state-v1';

export function initialData(preloaded: Partial<AppData> = {}): AppData {
  return {
    portfolio: preloaded.portfolio ?? initialPortfolioState(),
    markets: preloaded.markets ?? initialMarketsState(),
    transactions: preloaded.transactions ?? initialTransactionsState(),
    watchlist: preloaded.watchlist ?? initialWatchlistState(),
    ui: preloaded.ui ?? initialUIState(),
  };
}

/** Only the data, never the action functions, is ever saved. */
export function pickData(state: AppData): AppData {
  return {
    portfolio: state.portfolio,
    markets: state.markets,
    transactions: state.transactions,
    watchlist: state.watchlist,
    ui: state.ui,
  };
}

/** Build a store; tests call this for an isolated instance. */
export function makeStore(preloaded?: Partial<AppData>): AppStore {
  return createStore<RootState>()((set) => {
    const mutate: Mutate = (recipe) =>
      set((state) =>
        produce(state, (draft) => {
          recipe(draft as AppData);
        }),
      );
    return {
      ...initialData(preloaded),
      ...createPortfolioActions(mutate),
      ...createMarketsActions(mutate),
      ...createTransactionsActions(mutate),
      ...createWatchlistActions(mutate),
      ...createUIActions(mutate),
    };
  });
}

function loadPersistedData(): Partial<AppData> | undefined {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return undefined;
    const parsed = JSON.parse(saved) as Record<string, unknown>;
    const data: Partial<AppData> = {};
    for (const key of DATA_KEYS) {
      if (parsed[key] && typeof parsed[key] === 'object') {
        (data as Record<string, unknown>)[key] = parsed[key];
      }
    }
    return data;
  } catch {
    return undefined;
  }
}

/** The app's store, restored from and saved to localStorage. */
export const store = makeStore(loadPersistedData());

store.subscribe((state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pickData(state)));
  } catch {
    // Storage can be disabled or full; the in-memory store remains usable.
  }
});
