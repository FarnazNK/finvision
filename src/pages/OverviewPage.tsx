import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import styled from 'styled-components';
import { useAppStore } from '@/app/hooks';
import { selectCurrency } from '@/features/ui/uiSlice';
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
import { Badge, Card, KpiTile, SegmentedControl, TickerBadge } from '@/components/primitives';
import { makeSelectRecentTransactions } from '@/features/transactions/transactionsSlice';
import { PortfolioCurveChart } from '@/components/charts/PortfolioCurveChart';
import { AllocationDonut } from '@/components/charts/AllocationDonut';
import { InsightsPanel } from '@/features/insights/InsightsPanel';
import { ASSET_CLASS_LABEL, formatDate, formatMoney, formatPercent } from '@/utils/format';
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
  const totalValue = useAppStore(selectTotalValue);
  const costBasis = useAppStore(selectTotalCostBasis);
  const totalGain = useAppStore(selectTotalGain);
  const totalGainPct = useAppStore(selectTotalGainPct);
  const dayChange = useAppStore(selectDayChange);
  const dayChangePct = useAppStore(selectDayChangePct);
  const curve = useAppStore(selectCurve);
  const allocation = useAppStore(selectAllocationByAssetClass);
  const holdingsCount = useAppStore(selectHoldingsCount);
  const topHoldingsSelector = useMemo(() => makeSelectTopHoldings(5), []);
  const topHoldings = useAppStore(topHoldingsSelector);
  const currency = useAppStore(selectCurrency);
  const recentSelector = useMemo(() => makeSelectRecentTransactions(5), []);
  const recent = useAppStore(recentSelector);

  return (
    <Page>
      <PageHeader>
        <div>
          <Eyebrow>Overview</Eyebrow>
          <Title>Your portfolio, at a glance</Title>
          <Subtitle>Performance, exposure and AI insights in one place.</Subtitle>
        </div>
        <QuickNav aria-label="Quick links">
          <QuickLink to="/holdings">Holdings</QuickLink>
          <QuickLink to="/markets">Markets</QuickLink>
          <QuickLink to="/watchlist">Watchlist</QuickLink>
        </QuickNav>
      </PageHeader>

      <SectionLabel>Portfolio snapshot</SectionLabel>
      <KpiGrid>
        <Card padded>
          <KpiTile
            label="Total value"
            value={formatMoney(totalValue, { currency })}
            changePct={dayChangePct}
            secondary={`${formatMoney(dayChange, { currency, signed: true })} today`}
          />
        </Card>
        <Card padded>
          <KpiTile
            label="Total return"
            value={formatMoney(totalGain, { currency, signed: true })}
            changePct={totalGainPct}
            secondary={`Cost basis ${formatMoney(costBasis, { currency, compact: true })}`}
          />
        </Card>
        <Card padded>
          <KpiTile
            label="Day's change"
            value={formatMoney(dayChange, { currency, signed: true })}
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

      <SectionLabel>Performance &amp; allocation</SectionLabel>
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
          className="wide-dashboard-card"
        >
          <PortfolioCurveChart points={curve} range={RANGE_DAYS[range]} />
        </Card>

        <Card title="Allocation" description="By asset class">
          <AllocationDonut data={allocation} totalValue={totalValue} />
        </Card>

        <Card
          title="Top holdings"
          description="Your five largest positions"
          actions={<CardLink to="/holdings">View all</CardLink>}
          className="wide-dashboard-card"
        >
          <HoldingList>
            {topHoldings.map((h) => {
              const value = h.quantity * h.price;
              return (
                <HoldingRow key={h.id}>
                  <TickerBadge symbol={h.symbol} />
                  <RowText>
                    <RowName>{h.name}</RowName>
                    <RowSub>
                      {h.symbol} · {ASSET_CLASS_LABEL[h.assetClass] ?? h.assetClass}
                    </RowSub>
                  </RowText>
                  <RowValue>
                    <strong>{formatMoney(value, { currency, compact: true })}</strong>
                    <RowPct $positive={h.dayChangePct >= 0}>
                      {formatPercent(h.dayChangePct)}
                    </RowPct>
                  </RowValue>
                </HoldingRow>
              );
            })}
          </HoldingList>
        </Card>

        <Card
          title="Recent activity"
          description="Latest transactions"
          actions={<CardLink to="/transactions">View all</CardLink>}
        >
          <HoldingList>
            {recent.map((tx) => (
              <ActivityRow key={tx.id}>
                <RowText>
                  <RowName>{tx.description}</RowName>
                  <RowSub>
                    {formatDate(tx.date, 'medium')}
                    {tx.status !== 'settled' && (
                      <>
                        {' · '}
                        <Badge tone={tx.status === 'pending' ? 'warn' : 'danger'}>{tx.status}</Badge>
                      </>
                    )}
                  </RowSub>
                </RowText>
                <RowValue>
                  <RowAmount $positive={tx.amount >= 0}>
                    {formatMoney(tx.amount, { currency, signed: true })}
                  </RowAmount>
                </RowValue>
              </ActivityRow>
            ))}
          </HoldingList>
        </Card>
      </Grid>
      <SectionLabel>Intelligence</SectionLabel>
      <FullWidth>
        <InsightsPanel />
      </FullWidth>
    </Page>
  );
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.space[3]};

  @media (max-width: 520px) {
    & > section > div { padding: ${({ theme }) => theme.space[4]}; }
  }

  ${media.sm`gap: ${({ theme }) => theme.space[4]};`}
  ${media.lg`grid-template-columns: repeat(4, 1fr);`}
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: 1fr;
  gap: ${({ theme }) => theme.space[4]};

  ${media.lg`grid-template-columns: repeat(3, minmax(0, 1fr)); 
    .wide-dashboard-card { grid-column: span 2; }`}
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

const SectionLabel = styled.h2`
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.fontSize.xs};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  letter-spacing: 0.12em;
  text-transform: uppercase;
`;

const QuickNav = styled.nav`
  display: flex;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.space[2]};
`;

const QuickLink = styled(Link)`
  display: inline-flex;
  align-items: center;
  height: 36px;
  padding: 0 ${({ theme }) => theme.space[4]};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.pill};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.text};
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: ${({ theme }) => theme.fontWeight.medium};
  transition: border-color ${({ theme }) => theme.motion.fast}, color ${({ theme }) => theme.motion.fast};

  &:hover {
    text-decoration: none;
    border-color: ${({ theme }) => theme.color.primary};
    color: ${({ theme }) => theme.color.primary};
  }
`;

const CardLink = styled(Link)`
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: ${({ theme }) => theme.fontWeight.medium};
  white-space: nowrap;
`;

const ActivityRow = styled.li`
  display: grid;
  grid-template-columns: 1fr auto;
  gap: ${({ theme }) => theme.space[3]};
  align-items: center;
  padding: ${({ theme }) => `${theme.space[3]} 0`};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};

  &:last-child {
    border-bottom: none;
  }
`;

const RowAmount = styled.strong<{ $positive: boolean }>`
  color: ${({ $positive, theme }) => ($positive ? theme.color.success : theme.color.text)};
`;
