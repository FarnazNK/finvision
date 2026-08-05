import { useMemo } from 'react';
import styled from 'styled-components';
import { useAppSelector } from '@/app/hooks';
import { selectHoldings } from '@/features/portfolio/portfolioSlice';
import { selectMarketHistory } from '@/features/markets/marketsSlice';
import { Card } from '@/components/primitives';
import { Sparkline } from '@/components/charts/Sparkline';
import { formatMoney, formatPercent } from '@/utils/format';
import { media } from '@/utils/responsive';

interface Mover {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
}

export function MarketsPage() {
  const holdings = useAppSelector(selectHoldings);
  const history = useAppSelector(selectMarketHistory);

  const movers: Mover[] = useMemo(
    () =>
      holdings
        .filter((h) => h.assetClass !== 'cash')
        .map((h) => ({
          symbol: h.symbol,
          name: h.name,
          price: h.price,
          changePct: h.dayChangePct,
        })),
    [holdings],
  );

  const gainers = useMemo(
    () => [...movers].sort((a, b) => b.changePct - a.changePct).slice(0, 5),
    [movers],
  );
  const losers = useMemo(
    () => [...movers].sort((a, b) => a.changePct - b.changePct).slice(0, 5),
    [movers],
  );

  return (
    <Page>
      <PageHeader>
        <div>
          <Eyebrow>Markets</Eyebrow>
          <Title>Live movers</Title>
          <Subtitle>Streaming updates for the symbols in your portfolio.</Subtitle>
        </div>
      </PageHeader>

      <Grid>
        <Card title="Top gainers" description="Largest day's percentage gains">
          <MoverList movers={gainers} history={history} tone="positive" />
        </Card>
        <Card title="Top losers" description="Largest day's percentage drops">
          <MoverList movers={losers} history={history} tone="negative" />
        </Card>
      </Grid>
    </Page>
  );
}

interface MoverListProps {
  movers: Mover[];
  history: Record<string, { symbol: string; price: number; changePct: number; t: number }[]>;
  tone: 'positive' | 'negative';
}

function MoverList({ movers, history, tone }: MoverListProps) {
  return (
    <List>
      {movers.map((m) => {
        const ticks = history[m.symbol] ?? [];
        return (
          <Row key={m.symbol}>
            <Sym aria-hidden="true">{m.symbol.slice(0, 4)}</Sym>
            <Stack>
              <Main>{m.name}</Main>
              <Sub>{m.symbol}</Sub>
            </Stack>
            <Spark>
              <Sparkline ticks={ticks} tone={tone} />
            </Spark>
            <Right>
              <Price>{formatMoney(m.price)}</Price>
              <Pct $positive={m.changePct >= 0}>{formatPercent(m.changePct)}</Pct>
            </Right>
          </Row>
        );
      })}
    </List>
  );
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

const Grid = styled.div`
  display: grid;
  gap: ${({ theme }) => theme.space[4]};
  grid-template-columns: 1fr;
  ${media.md`grid-template-columns: 1fr 1fr;`}
`;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const Row = styled.li`
  display: grid;
  grid-template-columns: 36px 1fr auto auto;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => `${theme.space[3]} 0`};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};

  &:last-child {
    border-bottom: none;
  }
`;

const Sym = styled.div`
  width: 36px;
  height: 36px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.surfaceAlt};
  font-family: ${({ theme }) => theme.font.mono};
  font-size: ${({ theme }) => theme.fontSize.xs};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ theme }) => theme.color.text};
  display: grid;
  place-items: center;
`;

const Stack = styled.div`
  min-width: 0;
`;

const Main = styled.div`
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: ${({ theme }) => theme.fontWeight.medium};
  color: ${({ theme }) => theme.color.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const Sub = styled.div`
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.color.textMuted};
`;

const Spark = styled.div`
  display: none;
  ${media.sm`display: block;`}
`;

const Right = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  font-variant-numeric: tabular-nums;
`;

const Price = styled.div`
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ theme }) => theme.color.text};
`;

const Pct = styled.span<{ $positive: boolean }>`
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ $positive, theme }) =>
    $positive ? theme.color.success : theme.color.danger};
  font-weight: ${({ theme }) => theme.fontWeight.medium};
`;
