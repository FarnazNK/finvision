/**
 * Minimal memoized selector, so derived data keeps a stable reference.
 *
 * Zustand re-renders a component whenever its selector returns a new
 * reference. Derived values like sorted lists or allocation buckets are
 * rebuilt on every call, so they are cached here against their inputs:
 * the combiner only runs again when one of the input selections changes.
 */
type Selector<S, R> = (state: S) => R;

export function createSelector<S, A, R>(
  inputs: [Selector<S, A>],
  combiner: (a: A) => R,
): Selector<S, R>;
export function createSelector<S, A, B, R>(
  inputs: [Selector<S, A>, Selector<S, B>],
  combiner: (a: A, b: B) => R,
): Selector<S, R>;
export function createSelector<S, A, B, C, R>(
  inputs: [Selector<S, A>, Selector<S, B>, Selector<S, C>],
  combiner: (a: A, b: B, c: C) => R,
): Selector<S, R>;
export function createSelector<S, R>(
  inputs: Selector<S, unknown>[],
  combiner: (...args: unknown[]) => R,
): Selector<S, R> {
  let lastArgs: unknown[] | null = null;
  let lastResult: R;
  return (state: S) => {
    const args = inputs.map((select) => select(state));
    if (lastArgs && args.every((arg, i) => Object.is(arg, lastArgs![i]))) {
      return lastResult;
    }
    lastArgs = args;
    lastResult = combiner(...args);
    return lastResult;
  };
}
