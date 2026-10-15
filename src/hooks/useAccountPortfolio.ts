import { useEffect, useState } from 'react';
import { useAppDispatch } from '@/app/hooks';
import { holdingsLoaded, holdingsLoadFailed, holdingsLoading, holdingsRepriced, portfolioReset } from '@/features/portfolio/portfolioSlice';
import { tickReceived } from '@/features/markets/marketsSlice';
import { fetchAccountHoldings, fetchAccountQuotes } from '@/services/accountPortfolioClient';
import { getAccessToken } from '@/services/authClient';

export type DataMode = 'demo' | 'account';
const MODE_KEY = 'finvision-data-mode';

export function getDataMode(): DataMode {
  return getAccessToken() && sessionStorage.getItem(MODE_KEY) === 'account' ? 'account' : 'demo';
}
export function setDataMode(mode: DataMode): void {
  sessionStorage.setItem(MODE_KEY, mode);
  window.dispatchEvent(new Event('finvision-data-mode-changed'));
}

export function useAccountPortfolio(): { mode: DataMode; refresh: () => void } {
  const dispatch = useAppDispatch();
  const [mode, setMode] = useState<DataMode>(getDataMode);
  const [refreshCount, setRefreshCount] = useState(0);
  useEffect(() => {
    const update = () => setMode(getDataMode());
    window.addEventListener('finvision-data-mode-changed', update);
    return () => window.removeEventListener('finvision-data-mode-changed', update);
  }, []);
  useEffect(() => {
    if (mode === 'demo') {
      dispatch(portfolioReset());
      return;
    }
    const controller = new AbortController();
    let timer: ReturnType<typeof setInterval> | undefined;
    dispatch(holdingsLoading());
    async function load() {
      try {
        const holdings = await fetchAccountHoldings(controller.signal);
        if (controller.signal.aborted) return;
        dispatch(holdingsLoaded(holdings));
        const update = async () => {
          try {
            const { ticks, failed } = await fetchAccountQuotes(holdings, controller.signal);
            if (controller.signal.aborted) return;
            if (ticks.length) {
              dispatch(holdingsRepriced(ticks));
              dispatch(tickReceived(ticks));
            }
            if (failed.length) dispatch(holdingsLoadFailed(`Quotes unavailable for: ${failed.join(', ')}. Showing cost basis for those positions.`));
          } catch {
            if (!controller.signal.aborted) dispatch(holdingsLoadFailed('Market quotes unavailable. Showing last known prices or cost basis.'));
          }
        };
        await update();
        if (!controller.signal.aborted) timer = setInterval(update, 60_000);
      } catch (error) {
        if (!controller.signal.aborted) dispatch(holdingsLoadFailed(error instanceof Error ? error.message : 'Unable to load account.'));
      }
    }
    void load();
    return () => {
      controller.abort();
      if (timer) clearInterval(timer);
    };
  }, [dispatch, mode, refreshCount]);
  return { mode, refresh: () => setRefreshCount((n) => n + 1) };
}
