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
import { MiniTrend } from '@/components/charts/MiniTrend';
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

  // Last 30 days of the equity curve drive the KPI trend lines.
  const trend30 = useMemo(() => curve.slice(-30).map((p) => p.value), [curve]);
  const returnTrend = useMemo(() => trend30.map((v) => v - costBasis), [trend30, costBasis]);
  const trend7 = useMemo(() => trend30.slice(-7), [trend30]);

  return (
    <Page>
      <PageHeader>
        <div>
          <Eyebrow>
            <LiveDot aria-hidden="true" /> Overview · {formatDate(Date.now(), 'medium')}
          </Eyebrow>
          <Title>
            Your portfolio, <Gradient>at a glance</Gradient>
          </Title>
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
            icon={<IconWallet />}
            accent="primary"
            chart={<MiniTrend values={trend30} tone="primary" label="Portfolio value, last 30 days" />}
          />
        </Card>
        <Card padded>
          <KpiTile
            label="Total return"
            value={formatMoney(totalGain, { currency, signed: true })}
            changePct={totalGainPct}
            secondary={`Cost basis ${formatMoney(costBasis, { currency, compact: true })}`}
            icon={<IconTrend />}
            accent="success"
            chart={<MiniTrend values={returnTrend} label="Total return, last 30 days" />}
          />
        </Card>
        <Card padded>
          <KpiTile
            label="Day's change"
            value={formatMoney(dayChange, { currency, signed: true })}
            changePct={dayChangePct}
            secondary="Across all positions"
            icon={<IconPulse />}
            accent="info"
            chart={<MiniTrend values={trend7} label="Portfolio value, last 7 days" />}
          />
        </Card>
        <Card padded>
          <KpiTile
            label="Positions"
            value={String(holdingsCount)}
            secondary={`${allocation.length} asset classes`}
            tone="neutral"
            icon={<IconLayers />}
            accent="accent"
            chart={<AllocationStrip allocation={allocation} />}
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

/** Stacked bar of asset-class weights; the legend lives in the Allocation card. */
function AllocationStrip({ allocation }: { allocation: { assetClass: string; weight: number }[] }) {
  return (
    <Strip
      role="img"
      aria-label={allocation
        .map((a) => `${ASSET_CLASS_LABEL[a.assetClass] ?? a.assetClass} ${formatPercent(a.weight, { signed: false })}`)
        .join(', ')}
    >
      {allocation.map((a, i) => (
        <StripSeg key={a.assetClass} $i={i} style={{ flexGrow: a.weight }} />
      ))}
    </Strip>
  );
}

const svgProps = {
  width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
  strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const,
};
const IconWallet = () => (
  <svg {...svgProps}><path d="M19 7V5a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3v2a1 1 0 0 1-1 1H5a2 2 0 0 1-2-2V6" /></svg>
);
const IconTrend = () => (
  <svg {...svgProps}><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></svg>
);
const IconPulse = () => (
  <svg {...svgProps}><path d="M3 12h4l3-8 4 16 3-8h4" /></svg>
);
const IconLayers = () => (
  <svg {...svgProps}><path d="m12 3 9 5-9 5-9-5 9-5z" /><path d="m3 13 9 5 9-5" /></svg>
);

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

const Gradient = styled.span`
  background: linear-gradient(100deg, ${({ theme }) => theme.color.info}, ${({ theme }) => theme.color.primary} 45%, ${({ theme }) => theme.color.accent});
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
`;

const LiveDot = styled.span`
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-right: 6px;
  vertical-align: middle;
  border-radius: 50%;
  background: ${({ theme }) => theme.color.success};
  box-shadow: 0 0 0 3px color-mix(in srgb, ${({ theme }) => theme.color.success} 25%, transparent),
    0 0 12px ${({ theme }) => theme.color.success};
`;

const Strip = styled.div`
  display: flex;
  gap: 3px;
  height: 8px;
  margin: 0 ${({ theme }) => theme.space[6]} ${({ theme }) => theme.space[6]};

  @media (max-width: 520px) {
    margin: 0 ${({ theme }) => theme.space[4]} ${({ theme }) => theme.space[4]};
  }
`;

const STRIP_TOKENS = ['primary', 'accent', 'info', 'success', 'warn'] as const;
const StripSeg = styled.span<{ $i: number }>`
  flex-basis: 0;
  min-width: 4px;
  border-radius: 99px;
  background: ${({ theme, $i }) => theme.color[STRIP_TOKENS[$i % STRIP_TOKENS.length]]};
  box-shadow: 0 0 10px -2px ${({ theme, $i }) => theme.color[STRIP_TOKENS[$i % STRIP_TOKENS.length]]};
`;

const Title = styled.h1`
  font-size: ${({ theme }) => theme.fontSize['2xl']};
  margin-top: ${({ theme }) => theme.space[2]};
  letter-spacing: -0.035em;
  font-weight: ${({ theme }) => theme.fontWeight.bold};

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
  -webkit-backdrop-filter: ${({ theme }) => theme.glass.blur};
  backdrop-filter: ${({ theme }) => theme.glass.blur};
  box-shadow: ${({ theme }) => theme.glass.highlight};
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
