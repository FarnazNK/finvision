import {
  useDispatch,
  useSelector,
  useStore,
  type TypedUseSelectorHook,
} from 'react-redux';
import type { AppDispatch, RootState } from './store';

// Pre-typed hooks so feature code never reaches for the raw types.
export const useAppDispatch: () => AppDispatch = useDispatch;
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
export const useAppStore = () => useStore<RootState>();
