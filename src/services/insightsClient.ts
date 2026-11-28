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
import { ProRequiredError, SignInRequiredError } from './errors';
import { InsightsRequestError } from './insightsErrors';
import { insightsResponseSchema, parseResponse, type InsightsResponse } from './schemas';

export type { Citation, InsightsResponse } from './schemas';
export { InsightsRequestError } from './insightsErrors';

const API_KEY = import.meta.env?.VITE_AI_SERVICE_API_KEY as string | undefined;

export async function askInsight(
  question: string,
  holdings: Holding[],
  transactions: Transaction[],
  baseCurrency = 'USD',
  signal?: AbortSignal,
): Promise<InsightsResponse> {
  const accessToken = getAccessToken();
  // Prefer the signed-in user's token: with billing on, AI insights are a Pro
  // feature checked against that user's subscription on the server.
  const credential = accessToken || API_KEY;

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

  if (res.status === 401) {
    throw new SignInRequiredError();
  }
  if (res.status === 402) {
    throw new ProRequiredError();
  }
  if (!res.ok) {
    throw new InsightsRequestError(res.status);
  }
  return parseResponse(insightsResponseSchema, await res.json(), '/api/insights');
}