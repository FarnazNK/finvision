import { useMemo, useState } from 'react';
import styled from 'styled-components';
import { useAppSelector } from '@/app/hooks';
import {
  makeSelectTopHoldings,
  selectAllocationByAssetClass,
  selectCurve,
  selectDayChange,
  selectDayChangePct,
  selectHoldingsCount,
  selectTotalCostBasis,
  selectTotalGain,
  selectTotalGainPct,
  selectTotalValue,
} from '@/features/portfolio/portfolioSlice';
import { Card, KpiTile, SegmentedControl } from '@/components/primitives';
import { PortfolioCurveChart } from '@/components/charts/PortfolioCurveChart';
import { AllocationDonut } from '@/components/charts/AllocationDonut';
import { InsightsPanel } from '@/features/insights/InsightsPanel';
import { ASSET_CLASS_LABEL, formatMoney, formatPercent } from '@/utils/format';
import { media } from '@/utils/responsive';

type Range = '1W' | '1M' | '3M' | '6M' | '1Y';
const RANGE_DAYS: Record<Range, number> = {
  '1W': 7,
  '1M': 30,
  '3M': 90,
  '6M': 180,
  '1Y': 365,
};

const RANGE_OPTIONS = [
  { value: '1W', label: '1W', ariaLabel: '1 week' },
  { value: '1M', label: '1M', ariaLabel: '1 month' },
  { value: '3M', label: '3M', ariaLabel: '3 months' },
  { value: '6M', label: '6M', ariaLabel: '6 months' },
  { value: '1Y', label: '1Y', ariaLabel: '1 year' },
] as const;

export function OverviewPage() {
  const [range, setRange] = useState<Range>('1M');
  const totalValue = useAppSelector(selectTotalValue);
  const costBasis = useAppSelector(selectTotalCostBasis);
  const totalGain = useAppSelector(selectTotalGain);
  const totalGainPct = useAppSelector(selectTotalGainPct);
  const dayChange = useAppSelector(selectDayChange);
  const dayChangePct = useAppSelector(selectDayChangePct);
  const curve = useAppSelector(selectCurve);
  const allocation = useAppSelector(selectAllocationByAssetClass);
  const holdingsCount = useAppSelector(selectHoldingsCount);
  const topHoldingsSelector = useMemo(() => makeSelectTopHoldings(5), []);
  const topHoldings = useAppSelector(topHoldingsSelector);

  return (
    <Page>
      <PageHeader>
        <div>
          <Eyebrow>Overview</Eyebrow>
          <Title>Good {greetingForHour()}, Farnaz</Title>
          <Subtitle>Here's where your portfolio stands today.</Subtitle>
        </div>
      </PageHeader>

      <KpiGrid>
        <Card padded>
          <KpiTile
            label="Total value"
            value={formatMoney(totalValue)}
            changePct={dayChangePct}
            secondary={`${formatMoney(dayChange, { signed: true })} today`}
          />
        </Card>
        <Card padded>
          <KpiTile
            label="Total return"
            value={formatMoney(totalGain, { signed: true })}
            changePct={totalGainPct}
            secondary={`Cost basis ${formatMoney(costBasis, { compact: true })}`}
          />
        </Card>
        <Card padded>
          <KpiTile
            label="Day's change"
            value={formatMoney(dayChange, { signed: true })}
            changePct={dayChangePct}
            secondary="Across all positions"
          />
        </Card>
        <Card padded>
          <KpiTile
            label="Positions"
            value={String(holdingsCount)}
            secondary={`${allocation.length} asset classes`}
            tone="neutral"
          />
        </Card>
      </KpiGrid>

      <FullWidth>
        <InsightsPanel />
      </FullWidth>

      <Grid>
        <Card
          title="Portfolio value"
          description={`Performance over the last ${rangeLabel(range)}`}
          actions={
            <SegmentedControl
              label="Time range"
              size="sm"
              value={range}
              onChange={setRange}
              options={RANGE_OPTIONS}
            />
          }
          style={{ gridColumn: 'span 2' }}
        >
          <PortfolioCurveChart points={curve} range={RANGE_DAYS[range]} />
        </Card>

        <Card title="Allocation" description="By asset class">
          <AllocationDonut data={allocation} totalValue={totalValue} />
        </Card>

        <Card
          title="Top holdings"
          description="Your five largest positions"
          style={{ gridColumn: 'span 2' }}
        >
          <HoldingList>
            {topHoldings.map((h) => {
              const value = h.quantity * h.price;
              return (
                <HoldingRow key={h.id}>
                  <Symbol aria-hidden="true">{h.symbol.slice(0, 4)}</Symbol>
                  <RowText>
                    <RowName>{h.name}</RowName>
                    <RowSub>
                      {h.symbol} · {ASSET_CLASS_LABEL[h.assetClass] ?? h.assetClass}
                    </RowSub>
                  </RowText>
                  <RowValue>
                    <strong>{formatMoney(value, { compact: true })}</strong>
                    <RowPct $positive={h.dayChangePct >= 0}>
                      {formatPercent(h.dayChangePct)}
                    </RowPct>
                  </RowValue>
                </HoldingRow>
              );
            })}
          </HoldingList>
        </Card>
      </Grid>
    </Page>
  );
}

function greetingForHour(): string {
  const h = new Date().getHours();
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

function rangeLabel(r: Range): string {
  return { '1W': 'week', '1M': 'month', '3M': '3 months', '6M': '6 months', '1Y': 'year' }[r];
}

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[6]};
`;

const PageHeader = styled.header`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[4]};
  flex-wrap: wrap;
`;

const Eyebrow = styled.div`
  font-size: ${({ theme }) => theme.fontSize.xs};
  font-weight: ${({ theme }) => theme.fontWeight.medium};
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${({ theme }) => theme.color.textMuted};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSize['2xl']};
  margin-top: ${({ theme }) => theme.space[1]};
  letter-spacing: -0.02em;

  ${media.md`font-size: ${({ theme }) => theme.fontSize['3xl']};`}
`;

const Subtitle = styled.p`
  margin-top: ${({ theme }) => theme.space[1]};
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.fontSize.sm};
`;

const FullWidth = styled.div`
  margin-bottom: 20px;
`;

const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.space[4]};

  ${media.sm`grid-template-columns: repeat(2, 1fr);`}
  ${media.lg`grid-template-columns: repeat(4, 1fr);`}
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.space[4]};

  ${media.lg`grid-template-columns: repeat(3, 1fr);`}
`;

const HoldingList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
`;

const HoldingRow = styled.li`
  display: grid;
  grid-template-columns: 36px 1fr auto;
  gap: ${({ theme }) => theme.space[3]};
  align-items: center;
  padding: ${({ theme }) => `${theme.space[3]} 0`};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};

  &:last-child {
    border-bottom: none;
  }
`;

const Symbol = styled.div`
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.surfaceAlt};
  color: ${({ theme }) => theme.color.text};
  display: grid;
  place-items: center;
  font-size: ${({ theme }) => theme.fontSize.xs};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  font-family: ${({ theme }) => theme.font.mono};
`;

const RowText = styled.div`
  min-width: 0;
`;

const RowName = styled.div`
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: ${({ theme }) => theme.fontWeight.medium};
  color: ${({ theme }) => theme.color.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const RowSub = styled.div`
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.color.textMuted};
`;

const RowValue = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  font-variant-numeric: tabular-nums;
  font-size: ${({ theme }) => theme.fontSize.sm};
`;

const RowPct = styled.span<{ $positive: boolean }>`
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ $positive, theme }) =>
    $positive ? theme.color.success : theme.color.danger};
  font-weight: ${({ theme }) => theme.fontWeight.medium};
`;
