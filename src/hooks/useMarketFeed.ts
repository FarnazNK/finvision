import { useEffect, useRef } from 'react';
import { useAppSelector } from '@/app/hooks';
import { selectLiveFeed } from '@/features/ui/uiSlice';
import { createMarketFeed, type MarketFeed } from '@/services/marketFeed';
import { store } from '@/app/store';

/**
 * Subscribes to the simulated market feed for the lifetime of the app.
 *
 * The feed is created once and reused; we only toggle it on/off when the
 * user pauses live data. This keeps reducer references stable and means
 * tests can construct a feed against `makeStore()` without colliding with
 * the singleton.
 */
export function useMarketFeed(): void {
  const liveFeed = useAppSelector(selectLiveFeed);
  const feedRef = useRef<MarketFeed | null>(null);

  useEffect(() => {
    if (!feedRef.current) {
      feedRef.current = createMarketFeed(store.dispatch, store.getState);
    }
    if (liveFeed) feedRef.current.start();
    else feedRef.current.stop();

    return () => {
      feedRef.current?.stop();
    };
  }, [liveFeed]);
}
