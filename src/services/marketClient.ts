import { API_BASE_URL } from './apiConfig';
import { getAccessToken } from './authClient';
import {
  marketQuoteSchema,
  marketQuotesResponseSchema,
  parseResponse,
  type MarketQuote,
  type MarketQuotesResponse,
} from './schemas';

export type { MarketQuote, MarketQuotesResponse } from './schemas';

/** Largest batch the API accepts in one request. */
export const MAX_QUOTE_SYMBOLS = 25;

/** Real quotes for several symbols in one request. Throws if none are available. */
export async function fetchQuotes(
  symbols: string[],
  signal?: AbortSignal,
): Promise<MarketQuotesResponse> {
  const list = symbols.slice(0, MAX_QUOTE_SYMBOLS).map(encodeURIComponent).join(',');
  const response = await fetch(`${API_BASE_URL}/api/markets/quotes?symbols=${list}`, {
    signal,
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error(`Market quotes request failed: ${response.status}`);
  }
  return parseResponse(marketQuotesResponseSchema, await response.json(), '/api/markets/quotes');
}

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