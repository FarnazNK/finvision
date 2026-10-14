import { useEffect, useMemo, useState } from 'react';
import styled from 'styled-components';
import { useAppSelector } from '@/app/hooks';
import { selectHoldings } from '@/features/portfolio/portfolioSlice';
import { selectMarketHistory } from '@/features/markets/marketsSlice';
import { Card } from '@/components/primitives';
import { Sparkline } from '@/components/charts/Sparkline';
import { formatMoney, formatPercent } from '@/utils/format';
import { media } from '@/utils/responsive';
import { fetchQuote, type MarketQuote } from '@/services/marketClient';
import { fetchSecFilings, type SecFilingsResponse } from '@/services/secClient';

interface Mover {
  symbol: string;
  name: string;
  price: number;
  changePct: number;
  source: 'provider' | 'demo';
}

export function MarketsPage() {
  const holdings = useAppSelector(selectHoldings);
  const history = useAppSelector(selectMarketHistory);
  const [quotes, setQuotes] = useState<Record<string, MarketQuote>>({});
  const [cik, setCik] = useState('320193');
  const [filings, setFilings] = useState<SecFilingsResponse | null>(null);
  const [filingsError, setFilingsError] = useState('');
  const [filingsLoading, setFilingsLoading] = useState(false);
  const [filingsController, setFilingsController] = useState<AbortController | null>(null);

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

  useEffect(() => () => filingsController?.abort(), [filingsController]);

  async function loadFilings() {
    if (!/^\\d{1,10}$/.test(cik.trim()) || filingsLoading) return;
    const controller = new AbortController();
    setFilingsController(controller);
    setFilingsLoading(true);
    setFilingsError('');
    setFilings(null);
    try {
      const response = await fetchSecFilings(cik.trim(), controller.signal);
      if (!controller.signal.aborted) setFilings(response);
    } catch (error) {
      if (!controller.signal.aborted) setFilingsError(error instanceof Error ? error.message : 'Could not load filings.');
    } finally {
      if (!controller.signal.aborted) setFilingsLoading(false);
    }
  }

  const movers: Mover[] = useMemo(
    () =>
      holdings
        .filter((h) => h.assetClass !== 'cash')
        .map((h) => ({
          symbol: h.symbol,
          name: h.name,
          source: quotes[h.symbol] ? 'provider' : 'demo',
          price: quotes[h.symbol]?.current ?? h.price,
          changePct: quotes[h.symbol]?.changePercent
            ? quotes[h.symbol].changePercent / 100
            : h.dayChangePct,
        })),
    [holdings, quotes],
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
          <Title>Market intelligence</Title>
          <Subtitle>
            Compare provider quotes with demo values and explore actual SEC regulatory filings. Provider access may be limited or delayed.
          </Subtitle>
        </div>
      </PageHeader>

      <Card title="Public SEC filings" description="Official SEC EDGAR records · Uses public data, not scraped HTML">
        <FilingForm onSubmit={(event) => { event.preventDefault(); void loadFilings(); }}>
          <FilingLabel htmlFor="sec-cik">Company CIK</FilingLabel>
          <FilingInput id="sec-cik" inputMode="numeric" pattern="[0-9]{1,10}" value={cik} onChange={(event) => setCik(event.target.value)} placeholder="e.g. 320193" required />
          <FilingButton type="submit" disabled={filingsLoading || !/^\\d{1,10}$/.test(cik.trim())}>{filingsLoading ? 'Loading…' : 'Find filings'}</FilingButton>
        </FilingForm>
        <SourceNote>Example CIK 320193 is Apple. Filings are public SEC records; these are not real-time stock prices.</SourceNote>
        {filingsError && <ErrorMessage role="alert">{filingsError}</ErrorMessage>}
        {filingsLoading && <SourceNote role="status">Retrieving official filing records…</SourceNote>}
        {filings && <section aria-live="polite">
          <CompanyHeading>{filings.company} · SEC CIK {filings.cik}</CompanyHeading>
          {filings.filings.length === 0 ? <SourceNote>No 10-K, 10-Q, or 8-K filings found in the recent submission window.</SourceNote> :
          <FilingList>{filings.filings.map((filing) => <li key={filing.url}>
            <FilingLink href={filing.url} target="_blank" rel="noopener noreferrer">{filing.form} · Filed {filing.filedAt} <span aria-hidden="true">↗</span></FilingLink>
          </li>)}</FilingList>}
          <SourceNote>Source: {filings.source} · Cached server-side for up to 15 minutes</SourceNote>
        </section>}
      </Card>
      <SourceNote>Market quote badges distinguish external provider data from simulated portfolio prices. A provider quote is not necessarily real-time.</SourceNote>
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
              <Sub>{m.symbol} · {m.source === 'provider' ? 'Provider quote' : 'Demo price'}</Sub>
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

const FilingForm = styled.form`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
`;
const FilingLabel = styled.label`
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: 600;
  color: ${({ theme }) => theme.color.text};
`;
const FilingInput = styled.input`
  min-width: 150px;
  flex: 1;
  padding: 10px 12px;
  border: 1px solid ${({ theme }) => theme.color.borderStrong};
  border-radius: ${({ theme }) => theme.radius.md};
  color: ${({ theme }) => theme.color.text};
  background: ${({ theme }) => theme.color.surface};
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.color.focusRing}; }
`;
const FilingButton = styled.button`
  border: 0;
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 11px 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.color.primaryText};
  background: ${({ theme }) => theme.color.primary};
  cursor: pointer;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
`;
const SourceNote = styled.p`
  margin-top: 12px;
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.fontSize.xs};
  line-height: 1.5;
`;
const ErrorMessage = styled.p`
  margin-top: 12px;
  color: ${({ theme }) => theme.color.danger};
`;
const CompanyHeading = styled.h3`
  margin-top: 20px;
  font-size: ${({ theme }) => theme.fontSize.md};
`;
const FilingList = styled.ul`
  margin-top: 12px;
  display: grid;
  gap: 10px;
  padding-left: 18px;
`;
const FilingLink = styled.a`
  color: ${({ theme }) => theme.color.primary};
  font-size: ${({ theme }) => theme.fontSize.sm};
  &:focus-visible { outline: 2px solid ${({ theme }) => theme.color.focusRing}; }
`;
