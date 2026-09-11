export interface AuthResponse {
  accessToken: string;
  tokenType: string;
}

export interface ApiHolding {
  id: number;
  symbol: string;
  name: string;
  assetClass: 'equity' | 'fixed_income' | 'cash' | 'alternative' | 'crypto';
  quantity: number;
  costBasis: number;
  price: number;
  dayChangePct: number;
  currency: string;
}

const BASE_URL =
  (import.meta.env?.VITE_AI_SERVICE_URL as string | undefined) ?? '/ai-service';
const TOKEN_KEY = 'finvision-access-token';

export function getAccessToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAccessToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function fetchAuthenticatedHoldings(signal?: AbortSignal): Promise<ApiHolding[]> {
  const token = getAccessToken();
  if (!token) throw new Error('Authentication required');
  const response = await fetch(`${BASE_URL}/api/portfolio/holdings`, {
    signal,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Portfolio request failed: ${response.status}`);
  return (await response.json()) as ApiHolding[];
}

export async function authenticate(
  path: 'register' | 'login',
  email: string,
  password: string,
): Promise<void> {
  const response = await fetch(`${BASE_URL}/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Authentication failed: ${response.status}`);
  }
  const data = (await response.json()) as AuthResponse;
  localStorage.setItem(TOKEN_KEY, data.accessToken);
}
