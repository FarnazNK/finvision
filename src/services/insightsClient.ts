/**
 * Client for the FinVision AI service.
 *
 * Signed in: only the question is sent. The server loads and prices the user's
 * saved holdings itself, so the browser can't change the figures the model
 * reasons over.
 *
 * Demo (signed out): the public sample portfolio shown on screen is sent to a
 * stateless demo endpoint that touches no user data.
 */
import type { Holding, Transaction } from '@/types/domain';
import { API_BASE_URL } from './apiConfig';
import { getAccessToken } from './authClient';

export interface Citation {
  kind: 'holding' | 'transaction' | 'metric';
  ref: string;
}

export interface InsightsResponse {
  answer: string;
  citations: Citation[];
  model: string;
}

export interface DemoPortfolio {
  holdings: Holding[];
  transactions: Transaction[];
  baseCurrency: string;
}

export async function askInsight(
  question: string,
  demoPortfolio: DemoPortfolio,
  signal?: AbortSignal,
): Promise<InsightsResponse> {
  const accessToken = getAccessToken();
  const request: RequestInit = accessToken
    ? {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ question }),
      }
    : {
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, portfolio: demoPortfolio }),
      };

  const path = accessToken ? '/api/insights' : '/api/demo/insights';
  const res = await fetch(`${API_BASE_URL}${path}`, { method: 'POST', signal, ...request });

  if (!res.ok) {
    throw new Error(`Insights request failed: ${res.status}`);
  }
  return (await res.json()) as InsightsResponse;
}
