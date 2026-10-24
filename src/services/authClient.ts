import { API_BASE_URL } from './apiConfig';

export interface AuthResponse {
  accessToken: string;
  tokenType: string;
}

const TOKEN_KEY = 'finvision-access-token';

function storage(): Storage | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    return null;
  }
}

export function getAccessToken(): string | null {
  return storage()?.getItem(TOKEN_KEY) ?? null;
}

export function isSignedIn(): boolean {
  return getAccessToken() !== null;
}

export function clearAccessToken(): void {
  storage()?.removeItem(TOKEN_KEY);
}

export async function authenticate(
  path: 'register' | 'login',
  email: string,
  password: string,
): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { detail?: string } | null;
    throw new Error(body?.detail ?? `Authentication failed: ${response.status}`);
  }
  const data = (await response.json()) as AuthResponse;
  storage()?.setItem(TOKEN_KEY, data.accessToken);
}
