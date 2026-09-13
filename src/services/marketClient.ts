import { API_BASE_URL } from './apiConfig';

export interface MarketQuote {
  symbol: string;
  current: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  timestamp: number;
}

const TOKEN_KEY = 'finvision-access-token';

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
  return (await response.json()) as MarketQuote;
}

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
}
