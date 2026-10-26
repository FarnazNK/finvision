import { API_BASE_URL } from './apiConfig';
import { getAccessToken } from './authClient';
import { marketQuoteSchema, parseResponse, type MarketQuote } from './schemas';

export type { MarketQuote } from './schemas';

export async function fetchQuote(
  symbol: string,
  signal?: AbortSignal,
): Promise<MarketQuote> {
  const response = await fetch(
    `${API_BASE_URL}/api/markets/quote?symbol=${encodeURIComponent(symbol)}`,
    {
      signal,
      headers: getAuthHeaders(),
    },
  );
  if (!response.ok) {
    throw new Error(`Market quote request failed: ${response.status}`);
  }
  return parseResponse(marketQuoteSchema, await response.json(), '/api/markets/quote');
}

function getAuthHeaders(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}