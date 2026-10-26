/**
 * Runtime contracts for data crossing the network boundary.
 *
 * TypeScript types disappear at runtime, so a backend change or a bad proxy
 * response would otherwise flow straight into Redux and the UI. Every API
 * response is parsed through one of these Zod schemas first; the exported
 * types are inferred from the schemas so the two can never drift apart.
 */
import { z } from 'zod';

export const MIN_PASSWORD_LENGTH = 12;

export const credentialsSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email.').email('Enter a valid email address.'),
  password: z
    .string()
    .min(MIN_PASSWORD_LENGTH, `Use at least ${MIN_PASSWORD_LENGTH} characters.`),
});
export type Credentials = z.infer<typeof credentialsSchema>;

export const authResponseSchema = z.object({
  accessToken: z.string().min(1),
  tokenType: z.string(),
});
export type AuthResponse = z.infer<typeof authResponseSchema>;

export const apiErrorSchema = z.object({
  detail: z.string(),
});

export const citationSchema = z.object({
  kind: z.enum(['holding', 'transaction', 'metric']),
  ref: z.string(),
});
export type Citation = z.infer<typeof citationSchema>;

export const insightsResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(citationSchema),
  model: z.string(),
});
export type InsightsResponse = z.infer<typeof insightsResponseSchema>;

export const marketQuoteSchema = z.object({
  symbol: z.string().min(1),
  current: z.number().finite(),
  change: z.number().finite(),
  changePercent: z.number().finite(),
  high: z.number().finite(),
  low: z.number().finite(),
  open: z.number().finite(),
  previousClose: z.number().finite(),
  timestamp: z.number().int().nonnegative(),
});
export type MarketQuote = z.infer<typeof marketQuoteSchema>;

/** Raised when a response does not match its contract. */
export class ContractError extends Error {
  constructor(endpoint: string, issues: z.ZodIssue[]) {
    const where = issues
      .slice(0, 3)
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    super(`Unexpected response from ${endpoint}: ${where}`);
    this.name = 'ContractError';
  }
}

/** Parse an API payload, throwing a readable ContractError on mismatch. */
export function parseResponse<T>(schema: z.ZodType<T>, data: unknown, endpoint: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ContractError(endpoint, result.error.issues);
  }
  return result.data;
}

/** First human-readable validation message, for showing inline in forms. */
export function firstIssue(error: z.ZodError): string {
  return error.issues[0]?.message ?? 'Check the form and try again.';
}
