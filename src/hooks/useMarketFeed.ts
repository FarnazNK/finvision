import { useEffect, useRef } from 'react';
import { useAppStore } from '@/app/hooks';
import { store } from '@/app/store';
import { selectLiveFeed } from '@/features/ui/uiSlice';
import { createMarketFeed, type MarketFeed } from '@/services/marketFeed';

/**
 * Subscribes to the simulated market feed for the lifetime of the app.
 *
 * The feed is created once and reused; we only toggle it on/off when the
 * user pauses live data. The feed reads and updates the store directly, so
 * tests can drive it against their own `makeStore()` instance.
 */
export function useMarketFeed(): void {
  const liveFeed = useAppStore(selectLiveFeed);
  const feedRef = useRef<MarketFeed | null>(null);

  useEffect(() => {
    if (!feedRef.current) {
      feedRef.current = createMarketFeed(store.getState);
    }
    if (liveFeed) feedRef.current.start();
    else feedRef.current.stop();

    return () => {
      feedRef.current?.stop();
    };
  }, [liveFeed]);
}
