import '@testing-library/jest-dom';

// jsdom doesn't implement matchMedia — needed by AppThemeProvider and any
// components using prefers-color-scheme.
if (typeof window !== 'undefined' && !window.matchMedia) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined, // legacy
      removeListener: () => undefined, // legacy
      dispatchEvent: () => false,
    }),
  });
}

// ResizeObserver is used by Recharts' ResponsiveContainer; jsdom lacks it.
if (typeof window !== 'undefined' && !(window as unknown as { ResizeObserver?: unknown }).ResizeObserver) {
  (window as unknown as { ResizeObserver: unknown }).ResizeObserver = class {
    observe() { /* noop */ }
    unobserve() { /* noop */ }
    disconnect() { /* noop */ }
  };
}
