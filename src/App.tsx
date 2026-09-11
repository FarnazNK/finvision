import { useEffect } from 'react';
import { Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { OverviewPage } from '@/pages/OverviewPage';
import { HoldingsPage } from '@/pages/HoldingsPage';
import { MarketsPage } from '@/pages/MarketsPage';
import { TransactionsPage } from '@/pages/TransactionsPage';
import { WatchlistPage } from '@/pages/WatchlistPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { AuthPage } from '@/pages/AuthPage';
import { LandingPage } from '@/pages/LandingPage';
import { useMarketFeed } from '@/hooks/useMarketFeed';
import { useAppDispatch } from '@/app/hooks';
import { holdingsLoaded } from '@/features/portfolio/portfolioSlice';
import { fetchAuthenticatedHoldings, getAccessToken } from '@/services/authClient';

export function App() {
  // Boots the simulated market feed; toggled by the live-feed UI control.
  useMarketFeed();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const navigate = useNavigate();
  const isPublicRoute =
    location.pathname === '/welcome' ||
    location.pathname === '/auth';

  useEffect(() => {
    if (!getAccessToken()) return;
    const controller = new AbortController();
    void fetchAuthenticatedHoldings(controller.signal)
      .then((holdings) =>
        dispatch(
          holdingsLoaded(
            holdings.map((holding) => ({ ...holding, id: String(holding.id) })),
          ),
        ),
      )
      .catch(() => {
        if (!controller.signal.aborted) navigate('/auth');
      });
    return () => controller.abort();
  }, [dispatch, navigate]);

  const routes = (
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/welcome" element={<LandingPage />} />
        <Route path="/app" element={<OverviewPage />} />
        <Route path="/holdings" element={<HoldingsPage />} />
        <Route path="/markets" element={<MarketsPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
  );

  return isPublicRoute ? routes : <AppShell>{routes}</AppShell>;
}
