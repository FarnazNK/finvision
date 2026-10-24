/**
 * Client for the signed-in user's saved portfolio.
 *
 * The server prices holdings and returns a snapshot; the dashboard renders it
 * as-is, and the AI assistant analyzes the same snapshot server-side.
 */
import type { AssetClass, Holding } from '@/types/domain';
import { API_BASE_URL } from './apiConfig';
import { clearAccessToken, getAccessToken } from './authClient';

export type PriceSource = 'market' | 'cost_basis' | 'mixed' | 'empty';

export interface AccountSnapshot {
  holdings: Holding[];
  baseCurrency: string;
  priceSource: PriceSource;
}

export interface NewHolding {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  /** Sent as strings so the server receives the exact decimal typed in. */
  quantity: string;
  costBasis: string;
  currency?: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  if (!token) throw new ApiError('Not signed in', 401);

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });
  if (res.status === 401) {
    // Expired or revoked token: drop it so the app falls back to the demo.
    clearAccessToken();
  }
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as { detail?: unknown } | null;
    const detail = typeof body?.detail === 'string' ? body.detail : `Request failed: ${res.status}`;
    throw new ApiError(detail, res.status);
  }
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export function fetchAccountSnapshot(): Promise<AccountSnapshot> {
  return request<AccountSnapshot>('/api/portfolio/snapshot');
}

export function createHolding(holding: NewHolding): Promise<unknown> {
  return request('/api/portfolio/holdings', {
    method: 'POST',
    body: JSON.stringify({ currency: 'USD', ...holding }),
  });
}

export function deleteHolding(id: string): Promise<void> {
  return request<void>(`/api/portfolio/holdings/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
