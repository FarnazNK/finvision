import { HISTORY_LIMIT, useInsightsStore } from './insightsStore';

const answer = { answer: 'All good.', citations: [], model: 'test' };

beforeEach(() => {
  useInsightsStore.getState().reset();
});

describe('insightsStore', () => {
  it('moves through loading to success', () => {
    const store = useInsightsStore.getState();
    store.requestStarted('How am I doing?');
    expect(useInsightsStore.getState().status).toBe('loading');

    store.requestSucceeded(answer);
    const state = useInsightsStore.getState();
    expect(state.status).toBe('success');
    expect(state.result).toEqual(answer);
    expect(state.error).toBeNull();
  });

  it('clears a previous result when a request fails', () => {
    const store = useInsightsStore.getState();
    store.requestStarted('q1');
    store.requestSucceeded(answer);
    store.requestStarted('q2');
    store.requestFailed('Unavailable');

    const state = useInsightsStore.getState();
    expect(state.status).toBe('error');
    expect(state.result).toBeNull();
    expect(state.error).toBe('Unavailable');
  });

  it('keeps recent questions newest-first without duplicates', () => {
    const store = useInsightsStore.getState();
    store.requestStarted('a');
    store.requestStarted('b');
    store.requestStarted('a');
    expect(useInsightsStore.getState().history).toEqual(['a', 'b']);
  });

  it(`caps history at ${HISTORY_LIMIT} questions`, () => {
    const store = useInsightsStore.getState();
    for (let i = 0; i < HISTORY_LIMIT + 3; i += 1) store.requestStarted(`q${i}`);
    const { history } = useInsightsStore.getState();
    expect(history).toHaveLength(HISTORY_LIMIT);
    expect(history[0]).toBe(`q${HISTORY_LIMIT + 2}`);
  });

  it('returns to idle when a request is cancelled', () => {
    const store = useInsightsStore.getState();
    store.requestStarted('q');
    store.requestCancelled();
    expect(useInsightsStore.getState().status).toBe('idle');
  });
});
