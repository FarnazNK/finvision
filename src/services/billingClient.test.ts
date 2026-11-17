// apiConfig reads Vite's import.meta.env, which Jest's CommonJS build can't parse.
jest.mock('./apiConfig', () => ({ API_BASE_URL: 'http://api.test' }));

import { fetchBillingStatus, openBillingPortal, startCheckout } from './billingClient';

const TOKEN_KEY = 'finvision-access-token';

function jsonResponse(status: number, body: unknown): Response {
  return { ok: status < 400, status, json: async () => body } as Response;
}

describe('billingClient', () => {
  const fetchMock = jest.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    sessionStorage.setItem(TOKEN_KEY, 'user-jwt');
  });

  afterEach(() => sessionStorage.clear());

  it('starts checkout with the user token and idempotency key, sending no price', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, { url: 'https://checkout.stripe.com/c/pay/cs_test' }),
    );

    await expect(startCheckout('attempt-key-123')).resolves.toBe(
      'https://checkout.stripe.com/c/pay/cs_test',
    );
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('http://api.test/api/billing/checkout');
    expect(init.method).toBe('POST');
    expect(init.headers).toEqual({
      Authorization: 'Bearer user-jwt',
      'Idempotency-Key': 'attempt-key-123',
    });
    expect(init.body).toBeUndefined();
  });

  it('refuses to redirect anywhere but Stripe', async () => {
    fetchMock.mockResolvedValue(jsonResponse(200, { url: 'https://evil.example/pay' }));
    await expect(startCheckout('attempt-key-123')).rejects.toThrow(/stripe\.com/);
  });

  it('requires sign-in before any billing call', async () => {
    sessionStorage.clear();
    await expect(openBillingPortal()).rejects.toThrow(/Sign in/);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('surfaces the API error message', async () => {
    fetchMock.mockResolvedValue(jsonResponse(409, { detail: 'Already subscribed' }));
    await expect(startCheckout('attempt-key-123')).rejects.toThrow('Already subscribed');
  });

  it('parses the plan status', async () => {
    fetchMock.mockResolvedValue(
      jsonResponse(200, {
        billingEnabled: true,
        plan: 'pro',
        status: 'active',
        currentPeriodEnd: '2026-12-17T00:00:00Z',
      }),
    );
    await expect(fetchBillingStatus()).resolves.toMatchObject({ plan: 'pro' });
  });
});
