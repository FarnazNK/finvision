/**
 * All money / number / date formatting routes through here so we have a single
 * place to localize, swap precision representation, or add accessibility hints.
 */

export interface FormatMoneyOptions {
  currency?: string;
  locale?: string;
  /** Trim cents on whole-thousand values to reduce visual noise on KPIs. */
  compact?: boolean;
  signed?: boolean;
}

export function formatMoney(value: number, opts: FormatMoneyOptions = {}): string {
  const {
    currency = 'USD',
    locale = 'en-US',
    compact = false,
    signed = false,
  } = opts;

  const fmt = new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    notation: compact && Math.abs(value) >= 10_000 ? 'compact' : 'standard',
    maximumFractionDigits: compact && Math.abs(value) >= 10_000 ? 1 : 2,
    signDisplay: signed ? 'exceptZero' : 'auto',
  });
  return fmt.format(value);
}

export function formatPercent(value: number, opts: { signed?: boolean; digits?: number } = {}): string {
  const { signed = true, digits = 2 } = opts;
  const fmt = new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    signDisplay: signed ? 'exceptZero' : 'auto',
  });
  return fmt.format(value);
}

export function formatNumber(value: number, digits = 2): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

export function formatDate(iso: string | number | Date, style: 'short' | 'medium' | 'long' = 'medium'): string {
  const d = typeof iso === 'string' || typeof iso === 'number' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: style,
  }).format(d);
}

export function formatTime(iso: string | number | Date): string {
  const d = typeof iso === 'string' || typeof iso === 'number' ? new Date(iso) : iso;
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}

export function formatRelativeTime(from: string | number | Date): string {
  const d = typeof from === 'string' || typeof from === 'number' ? new Date(from) : from;
  const seconds = Math.round((Date.now() - d.getTime()) / 1000);
  const rtf = new Intl.RelativeTimeFormat('en-US', { numeric: 'auto' });
  if (seconds < 60) return rtf.format(-seconds, 'second');
  if (seconds < 3600) return rtf.format(-Math.round(seconds / 60), 'minute');
  if (seconds < 86_400) return rtf.format(-Math.round(seconds / 3600), 'hour');
  return rtf.format(-Math.round(seconds / 86_400), 'day');
}

/** Human label for asset class enum values. */
export const ASSET_CLASS_LABEL: Record<string, string> = {
  equity: 'Equities',
  fixed_income: 'Fixed income',
  cash: 'Cash',
  alternative: 'Alternatives',
  crypto: 'Crypto',
};
