import { API_BASE_URL } from './apiConfig';
import { getAccessToken } from './authClient';
import type { Holding, MarketTick } from '@/types/domain';

interface ServerHolding {
  id: number;
  symbol: string;
  name: string;
  assetClass: Holding['assetClass'];
  quantity: number;
  costBasis: number;
  currency: string;
}

export async function fetchAccountHoldings(signal?: AbortSignal): Promise<Holding[]> {
  const token = getAccessToken();
  if (!token) throw new Error('Sign in to load your account holdings.');
  const response = await fetch(`${API_BASE_URL}/api/portfolio/holdings`, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!response.ok) throw new Error(response.status === 401
    ? 'Your session expired. Sign in again.'
    : `Unable to load account holdings (${response.status}).`);
  const records = await response.json() as ServerHolding[];
  return records.map((record) => ({
    ...record,
    id: String(record.id),
    price: record.costBasis,
    dayChangePct: 0,
  }));
}

export async function fetchAccountQuotes(
  holdings: Holding[],
  signal?: AbortSignal,
): Promise<{ ticks: MarketTick[]; failed: string[] }> {
  const symbols = [...new Set(holdings.filter((h) => h.assetClass !== 'cash').map((h) => h.symbol))];
  const results = await Promise.allSettled(symbols.map(async (symbol) => {
    const response = await fetch(
      `${API_BASE_URL}/api/markets/quote?symbol=${encodeURIComponent(symbol)}`,
      { signal },
    );
    if (!response.ok) throw new Error(`Quote unavailable: ${symbol}`);
    const quote = await response.json() as { current: number; changePercent: number; timestamp: number };
    if (!Number.isFinite(quote.current) || quote.current <= 0 || !Number.isFinite(quote.changePercent) || quote.timestamp <= 0) {
      throw new Error(`Invalid quote: ${symbol}`);
    }
    return { symbol, price: quote.current, changePct: quote.changePercent / 100, t: quote.timestamp * 1000 };
  }));
  return {
    ticks: results.flatMap((result) => result.status === 'fulfilled' ? [result.value] : []),
    failed: results.flatMap((result, index) => result.status === 'rejected' ? [symbols[index]] : []),
  };
}
