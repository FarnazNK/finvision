import { useCallback, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { clearAccessToken, isSignedIn } from '@/services/authClient';
import {
  loadAccountPortfolio,
  portfolioReset,
  selectPortfolioSource,
} from './portfolioSlice';

/**
 * Keeps the dashboard in sync with the sign-in state: a valid session shows
 * the user's saved holdings, otherwise the public demo portfolio.
 */
export function useAccountSession(): void {
  const dispatch = useAppDispatch();
  const source = useAppSelector(selectPortfolioSource);

  useEffect(() => {
    if (source === 'demo' && isSignedIn()) {
      void dispatch(loadAccountPortfolio()).then((action) => {
        // A rejected load with the token gone means the session expired.
        if (loadAccountPortfolio.rejected.match(action) && !isSignedIn()) {
          dispatch(portfolioReset());
        }
      });
    }
    if (source === 'account' && !isSignedIn()) {
      dispatch(portfolioReset());
    }
  }, [dispatch, source]);
}

export function useSignOut(): () => void {
  const dispatch = useAppDispatch();
  return useCallback(() => {
    clearAccessToken();
    dispatch(portfolioReset());
  }, [dispatch]);
}
