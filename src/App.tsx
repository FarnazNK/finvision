import { Route, Routes, useLocation } from 'react-router-dom';
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

export function App() {
  // Boots the simulated market feed; toggled by the live-feed UI control.
  useMarketFeed();
  const location = useLocation();
  const isPublicRoute =
    location.pathname === '/' ||
    location.pathname === '/welcome' ||
    location.pathname === '/auth';

  const routes = (
      <Routes>
        <Route path="/" element={<LandingPage />} />
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
