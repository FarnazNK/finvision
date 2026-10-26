import {
  ContractError,
  credentialsSchema,
  firstIssue,
  insightsResponseSchema,
  marketQuoteSchema,
  parseResponse,
} from './schemas';

const validQuote = {
  symbol: 'AAPL',
  current: 190.5,
  change: 1.2,
  changePercent: 0.63,
  high: 191,
  low: 188.2,
  open: 189,
  previousClose: 189.3,
  timestamp: 1_730_000_000,
};

describe('credentialsSchema', () => {
  it('accepts a valid email and trims it', () => {
    const parsed = credentialsSchema.parse({
      email: '  user@example.com ',
      password: 'correct-horse-battery',
    });
    expect(parsed.email).toBe('user@example.com');
  });

  it('rejects a malformed email with a readable message', () => {
    const result = credentialsSchema.safeParse({ email: 'nope', password: 'long-enough-pass' });
    expect(result.success).toBe(false);
    if (!result.success) expect(firstIssue(result.error)).toBe('Enter a valid email address.');
  });

  it('rejects passwords shorter than 12 characters', () => {
    const result = credentialsSchema.safeParse({ email: 'a@b.co', password: 'short' });
    expect(result.success).toBe(false);
    if (!result.success) expect(firstIssue(result.error)).toMatch(/at least 12/);
  });
});

describe('marketQuoteSchema', () => {
  it('parses a well-formed quote', () => {
    expect(parseResponse(marketQuoteSchema, validQuote, '/q')).toEqual(validQuote);
  });

  it('rejects a quote with a non-numeric price', () => {
    expect(() =>
      parseResponse(marketQuoteSchema, { ...validQuote, current: '190.5' }, '/api/markets/quote'),
    ).toThrow(ContractError);
  });

  it('names the failing field in the error message', () => {
    expect(() =>
      parseResponse(marketQuoteSchema, { ...validQuote, symbol: '' }, '/api/markets/quote'),
    ).toThrow(/\/api\/markets\/quote: symbol/);
  });
});

describe('insightsResponseSchema', () => {
  it('accepts cited answers', () => {
    const data = {
      answer: 'You are concentrated in tech.',
      citations: [{ kind: 'metric', ref: 'get_concentration' }],
      model: 'offline-fallback',
    };
    expect(parseResponse(insightsResponseSchema, data, '/api/insights')).toEqual(data);
  });

  it('rejects an unknown citation kind', () => {
    const data = {
      answer: 'x',
      citations: [{ kind: 'rumour', ref: 'r' }],
      model: 'm',
    };
    expect(() => parseResponse(insightsResponseSchema, data, '/api/insights')).toThrow(
      ContractError,
    );
  });
});
