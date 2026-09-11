/**
 * Client for the FinVision AI service.
 *
 * Authenticated requests send only the question. The API loads the user's
 * portfolio from its database; demo requests may send the offline snapshot.
 */
import type { Holding, Transaction } from '@/types/domain';
import { getAccessToken } from '@/services/authClient';

const BASE_URL =
  (import.meta.env?.VITE_AI_SERVICE_URL as string | undefined) ?? '/ai-service';

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
  const token = getAccessToken();
  const authenticated = Boolean(token);
  const response = await fetch(
    `${BASE_URL}${authenticated ? '/api/v1/insights' : '/api/insights'}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(
        authenticated
          ? { question }
          : { question, portfolio: { holdings, transactions, baseCurrency } },
      ),
      signal,
    },
  );

  if (!response.ok) {
    throw new Error(`Insights request failed: ${response.status}`);
  }
  return (await response.json()) as InsightsResponse;
}
