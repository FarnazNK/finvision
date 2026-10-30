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
  /** Small glyph shown in a glowing orb beside the label. */
  icon?: ReactNode;
  /** Colour of the icon orb and ambient glow. */
  accent?: 'primary' | 'accent' | 'success' | 'info';
  /** Optional mini chart rendered flush along the bottom of the tile. */
  chart?: ReactNode;
}

export function KpiTile({
  label,
  value,
  changePct,
  secondary,
  tone,
  icon,
  accent = 'primary',
  chart,
}: KpiTileProps) {
  const inferredTone: 'neutral' | 'positive' | 'negative' =
    tone ?? (changePct === undefined || changePct === 0
      ? 'neutral'
      : changePct > 0
        ? 'positive'
        : 'negative');

  return (
    <Tile $accent={accent}>
      <Head>
        <Label>{label}</Label>
        {icon && (
          <Orb $accent={accent} aria-hidden="true">
            {icon}
          </Orb>
        )}
      </Head>
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
      {chart && <ChartSlot>{chart}</ChartSlot>}
    </Tile>
  );
}

type Accent = NonNullable<KpiTileProps['accent']>;

const Tile = styled.div<{ $accent: Accent }>`
  position: relative;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
  min-width: 0;
  height: 100%;

  /* Ambient colour bloom in the top-right corner, clipped by the card. */
  &::after {
    content: '';
    position: absolute;
    top: -70px;
    right: -60px;
    width: 180px;
    height: 180px;
    border-radius: 50%;
    background: ${({ theme, $accent }) => theme.color[$accent]};
    opacity: ${({ theme }) => (theme.name === 'dark' ? 0.16 : 0.12)};
    filter: blur(48px);
    pointer-events: none;
  }
`;

const Head = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[2]};
`;

const Orb = styled.span<{ $accent: Accent }>`
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme, $accent }) => theme.color[$accent]};
  background: color-mix(in srgb, ${({ theme, $accent }) => theme.color[$accent]} 14%, transparent);
  box-shadow:
    inset 0 0 0 1px color-mix(in srgb, ${({ theme, $accent }) => theme.color[$accent]} 30%, transparent),
    0 6px 18px -6px color-mix(in srgb, ${({ theme, $accent }) => theme.color[$accent]} 70%, transparent);
  flex-shrink: 0;
`;

const ChartSlot = styled.div`
  margin-top: auto;
  padding-top: ${({ theme }) => theme.space[3]};
  /* Bleed to the card edges for a flush, dashboard-style finish. */
  margin-left: calc(-1 * ${({ theme }) => theme.space[6]});
  margin-right: calc(-1 * ${({ theme }) => theme.space[6]});
  margin-bottom: calc(-1 * ${({ theme }) => theme.space[6]});

  @media (max-width: 520px) {
    margin-left: calc(-1 * ${({ theme }) => theme.space[4]});
    margin-right: calc(-1 * ${({ theme }) => theme.space[4]});
    margin-bottom: calc(-1 * ${({ theme }) => theme.space[4]});
  }
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
  font-size: clamp(1.15rem, 0.9rem + 1.4vw, ${({ theme }) => theme.fontSize['2xl']});
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  letter-spacing: -0.035em;
  overflow-wrap: anywhere;
  color: ${({ theme }) => theme.color.text};
  text-shadow: ${({ theme }) => (theme.name === 'dark' ? '0 0 24px rgba(160, 185, 255, 0.18)' : 'none')};
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
