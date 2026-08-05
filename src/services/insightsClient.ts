/**
 * Client for the FinVision AI service (`ai-service/`).
 *
 * The whole portfolio snapshot is sent with each question so answers are
 * grounded in the user's real holdings. Base URL is configurable via
 * `VITE_AI_SERVICE_URL` and defaults to the local uvicorn dev server.
 */
import type { Holding, Transaction } from '@/types/domain';

const BASE_URL =
  (import.meta.env?.VITE_AI_SERVICE_URL as string | undefined) ??
  'http://localhost:8000';

export interface Citation {
  kind: 'holding' | 'transaction' | 'metric';
  ref: string;
}

export interface InsightsResponse {
  answer: string;
  citations: Citation[];
  model: string;
}

export async function askInsight(
  question: string,
  holdings: Holding[],
  transactions: Transaction[],
  baseCurrency = 'USD',
  signal?: AbortSignal,
): Promise<InsightsResponse> {
  const res = await fetch(`${BASE_URL}/api/insights`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      question,
      portfolio: { holdings, transactions, baseCurrency },
    }),
    signal,
  });

  if (!res.ok) {
    throw new Error(`Insights request failed: ${res.status}`);
  }
  return (await res.json()) as InsightsResponse;
}
