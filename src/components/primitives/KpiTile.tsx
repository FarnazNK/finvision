import type { ReactNode } from 'react';
import styled, { css } from 'styled-components';
import { formatPercent } from '@/utils/format';

export interface KpiTileProps {
  label: string;
  value: ReactNode;
  /** Decimal change (0.012 = +1.2%). Drives both color and arrow. */
  changePct?: number;
  /** Secondary line below the value, e.g. "vs. last week". */
  secondary?: ReactNode;
  /** Tone override; otherwise inferred from changePct sign. */
  tone?: 'neutral' | 'positive' | 'negative';
}

export function KpiTile({ label, value, changePct, secondary, tone }: KpiTileProps) {
  const inferredTone: 'neutral' | 'positive' | 'negative' =
    tone ?? (changePct === undefined || changePct === 0
      ? 'neutral'
      : changePct > 0
        ? 'positive'
        : 'negative');

  return (
    <Tile>
      <Label>{label}</Label>
      <Value>{value}</Value>
      <Foot>
        {changePct !== undefined && (
          <Trend $tone={inferredTone} aria-label={`Change: ${formatPercent(changePct)}`}>
            <Arrow $tone={inferredTone} aria-hidden="true">
              {inferredTone === 'positive' ? '▲' : inferredTone === 'negative' ? '▼' : '–'}
            </Arrow>
            <span>{formatPercent(changePct)}</span>
          </Trend>
        )}
        {secondary && <Secondary>{secondary}</Secondary>}
      </Foot>
    </Tile>
  );
}

const Tile = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
  min-width: 0;
`;

const Label = styled.div`
  font-size: ${({ theme }) => theme.fontSize.xs};
  font-weight: ${({ theme }) => theme.fontWeight.medium};
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.color.textMuted};
`;

const Value = styled.div`
  font-family: ${({ theme }) => theme.font.sans};
  font-size: ${({ theme }) => theme.fontSize['2xl']};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  letter-spacing: -0.02em;
  color: ${({ theme }) => theme.color.text};
  font-variant-numeric: tabular-nums;
  line-height: 1.1;
`;

const Foot = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  font-size: ${({ theme }) => theme.fontSize.sm};
  flex-wrap: wrap;
`;

const tones = {
  positive: css`
    color: ${({ theme }) => theme.color.success};
    background: color-mix(in srgb, ${({ theme }) => theme.color.success} 12%, transparent);
  `,
  negative: css`
    color: ${({ theme }) => theme.color.danger};
    background: color-mix(in srgb, ${({ theme }) => theme.color.danger} 12%, transparent);
  `,
  neutral: css`
    color: ${({ theme }) => theme.color.textMuted};
    background: ${({ theme }) => theme.color.surfaceAlt};
  `,
};

const Trend = styled.span<{ $tone: 'positive' | 'negative' | 'neutral' }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[1]};
  padding: ${({ theme }) => `${theme.space[1]} ${theme.space[2]}`};
  border-radius: ${({ theme }) => theme.radius.sm};
  font-variant-numeric: tabular-nums;
  font-weight: ${({ theme }) => theme.fontWeight.medium};
  ${({ $tone }) => tones[$tone]}
`;

const Arrow = styled.span<{ $tone: 'positive' | 'negative' | 'neutral' }>`
  font-size: 0.75em;
`;

const Secondary = styled.span`
  color: ${({ theme }) => theme.color.textMuted};
`;
