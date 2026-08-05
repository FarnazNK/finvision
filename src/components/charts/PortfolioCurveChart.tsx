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

export function PortfolioCurveChart({ points, range, height = 280 }: Props) {
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
          <linearGradient id="curveFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.color.primary} stopOpacity={0.32} />
            <stop offset="100%" stopColor={theme.color.primary} stopOpacity={0} />
          </linearGradient>
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
            background: theme.color.surface,
            border: `1px solid ${theme.color.border}`,
            borderRadius: theme.radius.md,
            boxShadow: theme.shadow.md,
            fontSize: theme.fontSize.sm,
            color: theme.color.text,
          }}
          labelFormatter={(v: number) => formatDate(v, 'medium')}
          formatter={(v: number) => [formatMoney(v), 'Value']}
        />
        <Area
          type="monotone"
          dataKey="value"
          stroke={theme.color.primary}
          strokeWidth={2}
          fill="url(#curveFill)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
