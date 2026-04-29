import { useTheme } from 'styled-components';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import type { MarketTick } from '@/types/domain';

interface Props {
  ticks: MarketTick[];
  width?: number;
  height?: number;
  /** Override stroke colour; otherwise inferred from last tick direction. */
  tone?: 'auto' | 'positive' | 'negative' | 'neutral';
}

export function Sparkline({ ticks, width = 120, height = 28, tone = 'auto' }: Props) {
  const theme = useTheme();
  if (ticks.length < 2) {
    return <span style={{ display: 'inline-block', width, height }} aria-hidden="true" />;
  }
  const direction =
    tone === 'auto'
      ? ticks[ticks.length - 1].price >= ticks[0].price
        ? 'positive'
        : 'negative'
      : tone;
  const stroke =
    direction === 'positive'
      ? theme.color.success
      : direction === 'negative'
        ? theme.color.danger
        : theme.color.textMuted;

  return (
    <span
      style={{ display: 'inline-block', width, height }}
      role="img"
      aria-label={`Trend ${direction}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={ticks} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="price"
            stroke={stroke}
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </span>
  );
}
