import { Route, Routes } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { OverviewPage } from '@/pages/OverviewPage';
import { HoldingsPage } from '@/pages/HoldingsPage';
import { MarketsPage } from '@/pages/MarketsPage';
import { TransactionsPage } from '@/pages/TransactionsPage';
import { WatchlistPage } from '@/pages/WatchlistPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { useMarketFeed } from '@/hooks/useMarketFeed';

export function App() {
  // Boots the simulated market feed; toggled by the live-feed UI control.
  useMarketFeed();

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<OverviewPage />} />
        <Route path="/holdings" element={<HoldingsPage />} />
        <Route path="/markets" element={<MarketsPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/watchlist" element={<WatchlistPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppShell>
  );
}
