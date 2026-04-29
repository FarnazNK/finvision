import {
  formatMoney,
  formatNumber,
  formatPercent,
  formatRelativeTime,
} from '@/utils/format';

describe('formatMoney', () => {
  test('renders USD by default with two decimal places', () => {
    expect(formatMoney(1234.5)).toBe('$1,234.50');
  });

  test('compact form for large values', () => {
    expect(formatMoney(1_250_000, { compact: true })).toMatch(/\$1\.[23]M/);
  });

  test('signed flag forces a + on positive amounts', () => {
    expect(formatMoney(50, { signed: true })).toContain('+');
    expect(formatMoney(-50, { signed: true })).toContain('-');
  });
});

describe('formatPercent', () => {
  test('signed by default', () => {
    expect(formatPercent(0.0123)).toContain('+');
    expect(formatPercent(-0.0123)).toContain('-');
  });

  test('uses the requested digit count', () => {
    expect(formatPercent(0.1, { digits: 0, signed: false })).toBe('10%');
  });
});

describe('formatNumber', () => {
  test('groups thousands and respects digit count', () => {
    expect(formatNumber(1234.567, 2)).toBe('1,234.57');
    expect(formatNumber(1234, 0)).toBe('1,234');
  });
});

describe('formatRelativeTime', () => {
  test('returns a string for a recent timestamp', () => {
    const result = formatRelativeTime(Date.now() - 5 * 1000);
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
  });
});
