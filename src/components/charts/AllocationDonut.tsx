import { useMemo } from 'react';
import styled, { useTheme } from 'styled-components';
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import { ASSET_CLASS_LABEL, formatMoney, formatPercent } from '@/utils/format';

interface Slice {
  assetClass: string;
  value: number;
  weight: number;
}

interface Props {
  data: Slice[];
  totalValue: number;
  height?: number;
}

export function AllocationDonut({ data, totalValue, height = 240 }: Props) {
  const theme = useTheme();

  const palette = useMemo(
    () => [
      theme.color.primary,
      theme.color.info,
      theme.color.success,
      theme.color.warn,
      theme.color.danger,
    ],
    [theme],
  );

  return (
    <Wrap>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="assetClass"
            innerRadius="60%"
            outerRadius="92%"
            paddingAngle={2}
            stroke={theme.color.surface}
            strokeWidth={2}
            isAnimationActive={false}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={palette[i % palette.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: theme.color.surface,
              border: `1px solid ${theme.color.border}`,
              borderRadius: theme.radius.md,
              boxShadow: theme.shadow.md,
              fontSize: theme.fontSize.sm,
              color: theme.color.text,
            }}
            formatter={(v: number) => formatMoney(v)}
            labelFormatter={(l: string) => ASSET_CLASS_LABEL[l] ?? l}
          />
        </PieChart>
      </ResponsiveContainer>
      <Center aria-hidden="true">
        <CenterValue>{formatMoney(totalValue, { compact: true })}</CenterValue>
        <CenterLabel>Total</CenterLabel>
      </Center>
      <Legend>
        {data.map((s, i) => (
          <LegendItem key={s.assetClass}>
            <Swatch style={{ background: palette[i % palette.length] }} />
            <span>{ASSET_CLASS_LABEL[s.assetClass] ?? s.assetClass}</span>
            <Weight>{formatPercent(s.weight, { signed: false, digits: 1 })}</Weight>
          </LegendItem>
        ))}
      </Legend>
    </Wrap>
  );
}

const Wrap = styled.div`
  position: relative;
`;

const Center = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  pointer-events: none;
`;

const CenterValue = styled.div`
  font-size: ${({ theme }) => theme.fontSize.xl};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ theme }) => theme.color.text};
  font-variant-numeric: tabular-nums;
`;

const CenterLabel = styled.div`
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.color.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const Legend = styled.ul`
  list-style: none;
  margin: ${({ theme }) => theme.space[4]} 0 0;
  padding: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: ${({ theme }) => theme.space[2]};
`;

const LegendItem = styled.li`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.color.textMuted};
  min-width: 0;
`;

const Swatch = styled.span`
  width: 10px;
  height: 10px;
  border-radius: 3px;
  flex-shrink: 0;
`;

const Weight = styled.span`
  margin-left: auto;
  color: ${({ theme }) => theme.color.text};
  font-variant-numeric: tabular-nums;
  font-weight: ${({ theme }) => theme.fontWeight.medium};
`;
