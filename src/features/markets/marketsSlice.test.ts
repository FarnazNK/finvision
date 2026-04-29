import { makeStore } from '@/app/store';
import {
  historyCleared,
  makeSelectSparkline,
  selectLastTickAt,
  tickReceived,
} from '@/features/markets/marketsSlice';
import type { MarketTick } from '@/types/domain';

const tick = (symbol: string, price: number, t = Date.now()): MarketTick => ({
  symbol,
  price,
  changePct: 0,
  t,
});

describe('markets slice', () => {
  test('tickReceived appends per-symbol history', () => {
    const store = makeStore();
    store.dispatch(tickReceived([tick('AAPL', 100), tick('MSFT', 200)]));
    store.dispatch(tickReceived([tick('AAPL', 101)]));

    const aapl = makeSelectSparkline('AAPL')(store.getState());
    const msft = makeSelectSparkline('MSFT')(store.getState());

    expect(aapl).toHaveLength(2);
    expect(aapl[1].price).toBe(101);
    expect(msft).toHaveLength(1);
  });

  test('history is capped per symbol', () => {
    const store = makeStore();
    const ticks = Array.from({ length: 80 }, (_, i) => tick('AAPL', 100 + i, i));
    store.dispatch(tickReceived(ticks));
    expect(makeSelectSparkline('AAPL')(store.getState()).length).toBeLessThanOrEqual(60);
  });

  test('lastTickAt updates on every tick batch', () => {
    const store = makeStore();
    expect(selectLastTickAt(store.getState())).toBeNull();
    store.dispatch(tickReceived([tick('AAPL', 100)]));
    expect(selectLastTickAt(store.getState())).not.toBeNull();
  });

  test('historyCleared empties everything', () => {
    const store = makeStore();
    store.dispatch(tickReceived([tick('AAPL', 100)]));
    store.dispatch(historyCleared());
    expect(makeSelectSparkline('AAPL')(store.getState())).toEqual([]);
    expect(selectLastTickAt(store.getState())).toBeNull();
  });
});
