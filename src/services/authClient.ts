import { API_BASE_URL } from './apiConfig';
import {
  apiErrorSchema,
  authResponseSchema,
  credentialsSchema,
  parseResponse,
  type AuthResponse,
} from './schemas';

export type { AuthResponse };

const TOKEN_KEY = 'finvision-access-token';

export function getAccessToken(): string | null {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function clearAccessToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

export async function authenticate(
  path: 'register' | 'login',
  email: string,
  password: string,
): Promise<void> {
  // Same rules the form enforces, re-checked here so no caller can skip them.
  const credentials = credentialsSchema.parse({ email, password });

  const response = await fetch(`${API_BASE_URL}/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const parsed = apiErrorSchema.safeParse(body);
    throw new Error(
      parsed.success ? parsed.data.detail : `Authentication failed: ${response.status}`,
    );
  }
  const data = parseResponse(authResponseSchema, await response.json(), `/api/auth/${path}`);
  sessionStorage.setItem(TOKEN_KEY, data.accessToken);
}
