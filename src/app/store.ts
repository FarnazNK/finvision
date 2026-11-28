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
import { validatePersisted } from '@/app/persistedSchema';

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

/**
 * Only user-owned data is saved between visits. Simulated prices and history
 * are regenerated on each load: persisting them let prices random-walk across
 * visits, and "today's change" kept growing because its baseline never reset.
 */
export const STORAGE_KEY = 'finvision-state-v2';
const LEGACY_STORAGE_KEYS = ['finvision-state-v1'];

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

/** The subset of state that is saved to localStorage. */
export function pickPersisted(state: AppData): Partial<AppData> {
  return {
    transactions: state.transactions,
    watchlist: state.watchlist,
    ui: state.ui,
  };
}

/** Larger saved state is ignored rather than parsed (corrupt or tampered). */
const MAX_SAVED_BYTES = 1_000_000;

export function loadPersistedData(storage: Storage = localStorage): Partial<AppData> | undefined {
  try {
    for (const key of LEGACY_STORAGE_KEYS) storage.removeItem(key);
    const saved = storage.getItem(STORAGE_KEY);
    if (!saved || saved.length > MAX_SAVED_BYTES) return undefined;
    return validatePersisted(JSON.parse(saved));
  } catch {
    return undefined;
  }
}

/** The app's store, restored from and saved to localStorage. */
export const store = makeStore(loadPersistedData());

store.subscribe((state) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pickPersisted(state)));
  } catch {
    // Storage can be disabled or full; the in-memory store remains usable.
  }
});
