/**
 * Session state for the Portfolio Insights panel, held in Zustand.
 *
 * The main app store (src/app/store.ts) owns the durable state (portfolio,
 * transactions, watchlist, UI preferences) and persists it to localStorage.
 * Insights state is different: the current question, the in-flight request
 * and a short history of recent questions only matter for this browser
 * session and should never be written to storage alongside financial data,
 * so they live in this separate, unpersisted Zustand store.
 */
import { create } from 'zustand';
import type { InsightsResponse } from '@/services/schemas';

export const HISTORY_LIMIT = 5;

export type InsightsStatus = 'idle' | 'loading' | 'success' | 'error';

export interface InsightsStore {
  question: string;
  status: InsightsStatus;
  result: InsightsResponse | null;
  error: string | null;
  /** Most recent questions first, de-duplicated, capped at HISTORY_LIMIT. */
  history: string[];
  setQuestion: (question: string) => void;
  requestStarted: (question: string) => void;
  requestSucceeded: (result: InsightsResponse) => void;
  requestFailed: (message: string) => void;
  requestCancelled: () => void;
  reset: () => void;
}

const initialState = {
  question: '',
  status: 'idle' as InsightsStatus,
  result: null,
  error: null,
  history: [] as string[],
};

export const useInsightsStore = create<InsightsStore>()((set) => ({
  ...initialState,
  setQuestion: (question) => set({ question }),
  requestStarted: (question) =>
    set((state) => ({
      question,
      status: 'loading',
      result: null,
      error: null,
      history: [question, ...state.history.filter((q) => q !== question)].slice(
        0,
        HISTORY_LIMIT,
      ),
    })),
  requestSucceeded: (result) => set({ status: 'success', result, error: null }),
  requestFailed: (message) => set({ status: 'error', result: null, error: message }),
  requestCancelled: () => set({ status: 'idle' }),
  reset: () => set({ ...initialState, history: [] }),
}));
