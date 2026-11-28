/**
 * Validation for state restored from localStorage.
 *
 * localStorage is untrusted input: another script on the origin, a browser
 * extension, an old app version or plain corruption can put anything there.
 * Each saved slice is checked against these schemas (with size limits) before
 * it reaches the store; a slice that fails falls back to its defaults, so bad
 * data cannot crash rendering (e.g. an invalid currency code in Intl) or bloat
 * memory.
 */
import { z } from 'zod';
import type { AppData } from '@/app/store';

const MAX_ITEMS = 1000;
const shortText = z.string().max(200);

const transactionSchema = z.object({
  id: shortText,
  date: z.string().max(40).refine((v) => !Number.isNaN(Date.parse(v)), 'invalid date'),
  type: z.enum(['buy', 'sell', 'dividend', 'deposit', 'withdrawal', 'fee']),
  symbol: z.string().max(20).optional(),
  description: z.string().max(500),
  amount: z.number(),
  currency: z.string().regex(/^[A-Z]{3}$/),
  status: z.enum(['settled', 'pending', 'failed']),
});

const transactionsStateSchema = z.object({
  items: z.array(transactionSchema).max(MAX_ITEMS),
  filter: z.enum(['all', 'buy', 'sell', 'dividend', 'deposit', 'withdrawal', 'fee']),
  search: z.string().max(200),
});

const watchlistStateSchema = z.object({
  items: z
    .array(z.object({ symbol: z.string().max(20), name: shortText, addedAt: z.string().max(40) }))
    .max(MAX_ITEMS),
});

const uiStateSchema = z.object({
  themeMode: z.enum(['light', 'dark', 'system']),
  sidebarCollapsed: z.boolean(),
  liveFeed: z.boolean(),
  currency: z.string().regex(/^[A-Z]{3}$/),
});

const SCHEMAS = {
  transactions: transactionsStateSchema,
  watchlist: watchlistStateSchema,
  ui: uiStateSchema,
} as const;

/** Keep only the saved slices that pass validation. */
export function validatePersisted(parsed: unknown): Partial<AppData> {
  if (!parsed || typeof parsed !== 'object') return {};
  const raw = parsed as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [key, schema] of Object.entries(SCHEMAS)) {
    const result = schema.safeParse(raw[key]);
    if (result.success) out[key] = result.data;
  }
  return out as Partial<AppData>;
}
