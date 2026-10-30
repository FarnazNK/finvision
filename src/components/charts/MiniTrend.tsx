import { useId, useMemo } from 'react';
import { useTheme } from 'styled-components';

interface MiniTrendProps {
  values: number[];
  /** Colour token key; defaults to the trend direction. */
  tone?: 'positive' | 'negative' | 'primary' | 'accent';
  height?: number;
  /** Accessible summary, e.g. "Up 4.2% over 30 days". Omit to hide from AT. */
  label?: string;
}

/**
 * Tiny area chart drawn as a single SVG path. Used inside KPI tiles where a
 * full Recharts instance per tile would be wasteful. Scales to its container
 * via viewBox + preserveAspectRatio="none", with a non-scaling stroke.
 */
export function MiniTrend({ values, tone, height = 44, label }: MiniTrendProps) {
  const theme = useTheme();
  const id = useId().replace(/:/g, '');

  const { line, area } = useMemo(() => buildPaths(values), [values]);
  if (!line) return null;

  const direction = values[values.length - 1] >= values[0] ? 'positive' : 'negative';
  const resolved = tone ?? direction;
  const color = {
    positive: theme.color.success,
    negative: theme.color.danger,
    primary: theme.color.primary,
    accent: theme.color.accent,
  }[resolved];

  return (
    <svg
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      width="100%"
      height={height}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      style={{ display: 'block', overflow: 'visible' }}
    >
      <defs>
        <linearGradient id={`mt-fill-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.35} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#mt-fill-${id})`} />
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
        style={{ filter: `drop-shadow(0 0 4px ${color})` }}
      />
    </svg>
  );
}

/** Exported for tests: maps values onto a 100x32 box with 2px vertical padding. */
export function buildPaths(values: number[]): { line: string; area: string } {
  if (values.length < 2) return { line: '', area: '' };
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * 100;
    const y = 30 - ((v - lo) / span) * 28;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const line = `M${pts.join(' L')}`;
  return { line, area: `${line} L100,32 L0,32 Z` };
}
