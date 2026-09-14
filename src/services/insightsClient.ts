/**
 * Client for the FinVision AI service.
 *
 * The whole portfolio snapshot is sent with each question so answers are
 * grounded in the user's real holdings. The service URL is configured through
 * VITE_AI_SERVICE_URL, with safe defaults for local development and production.
 */
import type { Holding, Transaction } from '@/types/domain';
import { API_BASE_URL } from './apiConfig';
import { getAccessToken } from './authClient';

const API_KEY = import.meta.env?.VITE_AI_SERVICE_API_KEY as string | undefined;

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
  const accessToken = getAccessToken();
  const credential = API_KEY || accessToken;

  const res = await fetch(`${API_BASE_URL}/api/insights`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(credential ? { Authorization: `Bearer ${credential}` } : {}),
    },
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