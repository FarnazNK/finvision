# FinVision — Wealth Dashboard

A wealth-management dashboard with real-time portfolio insights, holdings,
transactions, and a watchlist. Streamed updates feed a Redux store, the UI is
built with styled-components, and the codebase is covered by Jest tests.

## Stack

- React 18 + TypeScript (strict mode)
- Redux Toolkit — slices, memoised selectors with `createSelector`, typed hooks
- styled-components — design-token theme system, light + dark + system modes
- React Router v6
- Recharts
- Jest + React Testing Library
- Vite

## Scripts

```
npm install
npm run dev          # Vite dev server on :3000
npm test             # Jest test suite
npm run typecheck    # tsc --noEmit
npm run build        # production bundle
npm run lint         # ESLint with jsx-a11y
```

## Architecture notes

### Redux

Five slices live under `src/features/*`. Each ships its actions, reducer, and
selectors together. Heavy selectors (allocation, total return, day's change)
go through `createSelector`. Parameterised selectors use the `makeSelectX(arg)`
factory pattern with `useMemo` at the call site for per-row selectors in
tables.

### Theming

Every visual primitive reads from a single design-token theme
(`src/theme/tokens.ts`). The theme is augmented into styled-components's
`DefaultTheme`, so `({ theme }) => theme.color.primary` is fully typed. Light,
dark, and system modes are supported, with a `prefers-color-scheme`
subscription.

### Real-time data

`src/services/marketFeed.ts` simulates a market-data WebSocket. It picks a
handful of holdings each tick, walks their prices, and dispatches batched
`tickReceived` actions. The portfolio slice listens to the same action and
reprices holdings deterministically. Pausing the feed flips a UI flag — the
hook (`useMarketFeed`) reacts and stops the interval.

### Accessibility

- Skip-to-main-content link in `AppShell`
- Form inputs have associated labels and `aria-describedby` wiring for hints
  and errors; errors render with `role="alert"`
- `SegmentedControl` is a `radiogroup` with arrow-key navigation
- Tables use `aria-sort` on sortable column headers
- `:focus-visible` styling
- `prefers-reduced-motion` honoured throughout
- KPI tiles expose change percentages via `aria-label`
- Buttons announce loading state with `aria-busy`

### Testing

Tests cover slices, selectors, format utilities, and component behaviour
including keyboard navigation and ARIA wiring. The `renderWithProviders`
helper wraps components in the real Provider, ThemeProvider, and MemoryRouter.

## Project structure

```
src/
├── app/             # Store config, typed hooks
├── components/
│   ├── primitives/  # Button, Card, KpiTile, Badge, Input, SegmentedControl, Skeleton
│   ├── charts/      # PortfolioCurveChart, AllocationDonut, Sparkline
│   └── layout/      # Sidebar, Topbar, AppShell
├── features/        # Redux slices: portfolio, markets, transactions, watchlist, ui
├── hooks/           # useMarketFeed
├── pages/           # Overview, Holdings, Markets, Transactions, Watchlist, NotFound
├── services/        # marketFeed (mock WS), seed data
├── theme/           # Design tokens, GlobalStyle, AppThemeProvider
├── test/            # Jest setup, renderWithProviders helper
├── types/           # Domain types
└── utils/           # Formatters, responsive helpers
```

## What's mocked

The market feed and seed data are local — no backend. The slice shapes were
designed for the swap to be straightforward: a single `tickReceived` action is
the only contract the feed exposes to the store.
