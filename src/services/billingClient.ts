/**
 * FinVision Pro billing (Stripe).
 *
 * The browser only asks the API to start Checkout or open the billing portal;
 * the price, the amount and the redirect URLs are all chosen on the server,
 * and card details are entered on Stripe's own page. Whether the user is on
 * Pro is decided by the server from Stripe's signed webhooks, never here.
 */
import { API_BASE_URL } from './apiConfig';
import { getAccessToken } from './authClient';
import {
  apiErrorSchema,
  billingRedirectSchema,
  billingStatusSchema,
  parseResponse,
  type BillingStatus,
} from './schemas';

export type { BillingStatus };

function authHeaders(): Record<string, string> {
  const token = getAccessToken();
  if (!token) throw new Error('Sign in to manage your FinVision Pro plan.');
  return { Authorization: `Bearer ${token}` };
}

async function failure(response: Response, fallback: string): Promise<Error> {
  const body: unknown = await response.json().catch(() => null);
  const parsed = apiErrorSchema.safeParse(body);
  return new Error(parsed.success ? parsed.data.detail : `${fallback}: ${response.status}`);
}

export async function fetchBillingStatus(): Promise<BillingStatus> {
  const response = await fetch(`${API_BASE_URL}/api/billing/status`, { headers: authHeaders() });
  if (!response.ok) throw await failure(response, 'Could not load your plan');
  return parseResponse(billingStatusSchema, await response.json(), '/api/billing/status');
}

/**
 * Returns the Stripe Checkout URL to send the user to. Pass the same
 * idempotency key for the same upgrade attempt, so a double click opens one
 * Checkout Session rather than two.
 */
export async function startCheckout(idempotencyKey: string): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/billing/checkout`, {
    method: 'POST',
    headers: { ...authHeaders(), 'Idempotency-Key': idempotencyKey },
  });
  if (!response.ok) throw await failure(response, 'Could not start checkout');
  return parseResponse(billingRedirectSchema, await response.json(), '/api/billing/checkout').url;
}

/** Returns the Stripe customer-portal URL (update card, cancel). */
export async function openBillingPortal(): Promise<string> {
  const response = await fetch(`${API_BASE_URL}/api/billing/portal`, {
    method: 'POST',
    headers: authHeaders(),
  });
  if (!response.ok) throw await failure(response, 'Could not open the billing portal');
  return parseResponse(billingRedirectSchema, await response.json(), '/api/billing/portal').url;
}

/** Send the browser to a Stripe-hosted page (separate so tests can stub it). */
export function redirectTo(url: string): void {
  window.location.assign(url);
}
