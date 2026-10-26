import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useAppStore } from '@/app/hooks';
import { selectHoldings } from '@/features/portfolio/portfolioSlice';
import { selectMarketHistory } from '@/features/markets/marketsSlice';
import { Card, TickerBadge } from '@/components/primitives';
import { Sparkline } from '@/components/charts/Sparkline';
import { formatMoney, formatPercent } from '@/utils/format';
import { media } from '@/utils/responsive';
import { fetchQuote, type MarketQuote } from '@/services/marketClient';

interface Mover {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
}

export function MarketsPage() {
  const holdings = useAppStore(selectHoldings);
  const history = useAppStore(selectMarketHistory);
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({});

  // Simulated price ticks replace the holdings array frequently. Depend on the
  // stable set of symbols instead so we do not refetch every quote on each tick.
  const quoteSymbolsKey = useMemo(
    () =>
      [...new Set(
        holdings
          .filter((holding) => holding.assetClass !== 'cash')
          .map((holding) => holding.symbol),
      )]
        .sort()
        .join('|'),
    [holdings],
  );

  useEffect(() => {
    const symbols = quoteSymbolsKey ? quoteSymbolsKey.split('|') : [];
    if (symbols.length === 0) {
      setQuotes({});
      return;
    }

    const controller = new AbortController();
    void Promise.all(
      symbols.map(async (symbol) => {
        try {
          return await fetchQuote(symbol, controller.signal);
        } catch {
          return null;
        }
      }),
    ).then((results) => {
      if (controller.signal.aborted) return;
      setQuotes(
        Object.fromEntries(
          results.filter((quote): quote is MarketQuote => quote !== null).map((quote) => [
            quote.symbol,
            quote,
          ]),
        ),
      );
    });

    return () => controller.abort();
  }, [quoteSymbolsKey]);

  const movers: Mover[] = useMemo(
    () =>
      holdings
        .filter((h) => h.assetClass !== 'cash')
        .map((h) => ({
          symbol: h.symbol,
          name: h.name,
          price: quotes[h.symbol]?.current ?? h.price,
          changePct: quotes[h.symbol]?.changePercent
            ? quotes[h.symbol].changePercent / 100
            : h.dayChangePct,
        })),
    [holdings, quotes],
  );

  // Only symbols that actually moved in that direction belong in each list.
  const gainers = useMemo(
    () => movers.filter((m) => m.changePct > 0).sort((a, b) => b.changePct - a.changePct).slice(0, 5),
    [movers],
  );
  const losers = useMemo(
    () => movers.filter((m) => m.changePct < 0).sort((a, b) => a.changePct - b.changePct).slice(0, 5),
    [movers],
  );
  const upCount = movers.filter((m) => m.changePct > 0).length;
  const downCount = movers.filter((m) => m.changePct < 0).length;
  const avgMove = movers.length ? movers.reduce((sum, m) => sum + m.changePct, 0) / movers.length : 0;

  return (
    <Page>
      <PageHeader>
        <div>
          <Eyebrow>Markets</Eyebrow>
          <Title>Market pulse</Title>
          <Subtitle>How the symbols you hold are moving today.</Subtitle>
        </div>
      </PageHeader>

      <Breadth aria-label="Today's market breadth">
        <BreadthItem>
          <BreadthLabel>Up today</BreadthLabel>
          <BreadthValue $tone="positive">{upCount}</BreadthValue>
        </BreadthItem>
        <BreadthItem>
          <BreadthLabel>Down today</BreadthLabel>
          <BreadthValue $tone="negative">{downCount}</BreadthValue>
        </BreadthItem>
        <BreadthItem>
          <BreadthLabel>Average move</BreadthLabel>
          <BreadthValue $tone={avgMove >= 0 ? 'positive' : 'negative'}>{formatPercent(avgMove)}</BreadthValue>
        </BreadthItem>
      </Breadth>

      <Grid>
        <Card title="Top gainers" description="Largest day's percentage gains">
          <MoverList movers={gainers} history={history} tone="positive" empty="Nothing is up today." />
        </Card>
        <Card title="Top losers" description="Largest day's percentage drops">
          <MoverList movers={losers} history={history} tone="negative" empty="Nothing is down today." />
        </Card>
      </Grid>
    </Page>
  );
}

interface MoverListProps {
  movers: Mover[];
  history: Record<string, { symbol: string; price: number; changePct: number; t: number }[]>;
  tone: 'positive' | 'negative';
  empty: string;
}

function MoverList({ movers, history, tone, empty }: MoverListProps) {
  if (movers.length === 0) return <EmptyText>{empty}</EmptyText>;
  return (
    <List>
      {movers.map((m) => {
        const ticks = history[m.symbol] ?? [];
        return (
          <Row key={m.symbol}>
            <TickerBadge symbol={m.symbol} />
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
  grid-template-columns: 36px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => `${theme.space[3]} 0`};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};

  &:last-child {
    border-bottom: none;
  }
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

const Breadth = styled.section`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.lg};
  background: ${({ theme }) => theme.color.surface};
  overflow: hidden;
`;

const BreadthItem = styled.div`
  padding: ${({ theme }) => `${theme.space[4]} ${theme.space[5]}`};
  & + & { border-left: 1px solid ${({ theme }) => theme.color.border}; }
  @media (max-width: 520px) { padding: ${({ theme }) => theme.space[3]}; }
`;

const BreadthLabel = styled.div`
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.fontSize.xs};
  text-transform: uppercase;
  letter-spacing: 0.06em;
`;

const BreadthValue = styled.div<{ $tone: 'positive' | 'negative' }>`
  margin-top: 4px;
  color: ${({ $tone, theme }) => ($tone === 'positive' ? theme.color.success : theme.color.danger)};
  font-size: ${({ theme }) => theme.fontSize.xl};
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  font-variant-numeric: tabular-nums;
`;

const EmptyText = styled.p`
  padding: ${({ theme }) => `${theme.space[6]} 0`};
  color: ${({ theme }) => theme.color.textMuted};
  text-align: center;
`;
