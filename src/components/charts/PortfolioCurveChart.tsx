import { useMemo } from 'react';
import { useTheme } from 'styled-components';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { PortfolioPoint } from '@/types/domain';
import { formatDate, formatMoney } from '@/utils/format';

interface Props {
  points: PortfolioPoint[];
  /** Number of trailing days to render. */
  range: number;
  height?: number;
}

export function PortfolioCurveChart({ points, range, height = 320 }: Props) {
  const theme = useTheme();

  const data = useMemo(() => {
    const end = points.length;
    const start = Math.max(0, end - range);
    return points.slice(start, end);
  }, [points, range]);

  // Provide a sensible Y-domain padding so the line never touches the edges.
  const [min, max] = useMemo(() => {
    if (data.length === 0) return [0, 1];
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of data) {
      if (p.value < lo) lo = p.value;
      if (p.value > hi) hi = p.value;
    }
    const pad = (hi - lo) * 0.08 || 1;
    return [Math.floor(lo - pad), Math.ceil(hi + pad)];
  }, [data]);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="finvisionPortfolioCurveFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.color.primary} stopOpacity={0.38} />
            <stop offset="55%" stopColor={theme.color.accent} stopOpacity={0.08} />
            <stop offset="100%" stopColor={theme.color.accent} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="finvisionPortfolioCurveStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={theme.color.info} />
            <stop offset="50%" stopColor={theme.color.primary} />
            <stop offset="100%" stopColor={theme.color.accent} />
          </linearGradient>
          <filter id="finvisionPortfolioCurveGlow" x="-5%" y="-30%" width="110%" height="160%">
            <feGaussianBlur stdDeviation="5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <CartesianGrid stroke={theme.color.chartGrid} strokeDasharray="3 6" vertical={false} />
        <XAxis
          dataKey="t"
          tickFormatter={(v) => formatDate(v, 'short')}
          stroke={theme.color.textSubtle}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          minTickGap={48}
        />
        <YAxis
          domain={[min, max]}
          tickFormatter={(v) => formatMoney(v, { compact: true })}
          stroke={theme.color.textSubtle}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={64}
        />
        <Tooltip
          cursor={{ stroke: theme.color.textMuted, strokeWidth: 1, strokeDasharray: '2 4' }}
          contentStyle={{
            background: `color-mix(in srgb, ${theme.color.surfaceSolid} 82%, transparent)`,
            backdropFilter: theme.glass.blur,
            border: `1px solid ${theme.color.borderStrong}`,
            borderRadius: theme.radius.md,
            boxShadow: theme.glass.shadow,
            fontSize: theme.fontSize.sm,
            color: theme.color.text,
          }}
          labelFormatter={(v: number) => formatDate(v, 'medium')}
          formatter={(v: number) => [formatMoney(v), 'Value']}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke="url(#finvisionPortfolioCurveStroke)"
          strokeWidth={2.5}
          filter="url(#finvisionPortfolioCurveGlow)"
          activeDot={{ r: 5, fill: theme.color.primary, stroke: theme.color.surfaceSolid, strokeWidth: 2 }}
          fill="url(#finvisionPortfolioCurveFill)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
