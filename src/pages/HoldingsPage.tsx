import { useMemo, useState } from 'react';
import styled, { css } from 'styled-components';
import { useAppSelector } from '@/app/hooks';
import { selectHoldings } from '@/features/portfolio/portfolioSlice';
import { makeSelectSparkline } from '@/features/markets/marketsSlice';
import { Badge, Card } from '@/components/primitives';
import { Sparkline } from '@/components/charts/Sparkline';
import {
  ASSET_CLASS_LABEL,
  formatMoney,
  formatNumber,
  formatPercent,
} from '@/utils/format';
import type { Holding } from '@/types/domain';
import type { RootState } from '@/app/store';
import { useSelector } from 'react-redux';
import { media } from '@/utils/responsive';

type SortKey = 'name' | 'assetClass' | 'quantity' | 'price' | 'value' | 'gain' | 'dayChangePct';
type SortDir = 'asc' | 'desc';

export function HoldingsPage() {
  const holdings = useAppSelector(selectHoldings);
  const [sort, setSort] = useState<{ key: SortKey; dir: SortDir }>({
    key: 'value',
    dir: 'desc',
  });

  const sorted = useMemo(() => {
    const cmp = (a: Holding, b: Holding) => {
      const va = readSortValue(a, sort.key);
      const vb = readSortValue(b, sort.key);
      if (va < vb) return sort.dir === 'asc' ? -1 : 1;
      if (va > vb) return sort.dir === 'asc' ? 1 : -1;
      return 0;
    };
    return [...holdings].sort(cmp);
  }, [holdings, sort]);

  const totalValue = useMemo(
    () => holdings.reduce((s, h) => s + h.quantity * h.price, 0),
    [holdings],
  );

  const toggleSort = (key: SortKey) => {
    setSort((s) =>
      s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' },
    );
  };

  return (
    <Page>
      <PageHeader>
        <div>
          <Eyebrow>Holdings</Eyebrow>
          <Title>{holdings.length} positions</Title>
          <Subtitle>{formatMoney(totalValue)} total market value</Subtitle>
        </div>
      </PageHeader>

      <Card padded={false}>
        <TableScroll>
          <Table role="table" aria-label="Holdings">
            <thead>
              <tr>
                <ThSortable scope="col" $align="left" sort={sort} k="name" onClick={() => toggleSort('name')}>
                  Name
                </ThSortable>
                <ThSortable scope="col" $align="left" sort={sort} k="assetClass" onClick={() => toggleSort('assetClass')}>
                  Class
                </ThSortable>
                <ThSortable scope="col" $align="right" sort={sort} k="quantity" onClick={() => toggleSort('quantity')}>
                  Qty
                </ThSortable>
                <ThSortable scope="col" $align="right" sort={sort} k="price" onClick={() => toggleSort('price')}>
                  Price
                </ThSortable>
                <ThSortable scope="col" $align="right" sort={sort} k="dayChangePct" onClick={() => toggleSort('dayChangePct')}>
                  Day
                </ThSortable>
                <ThSortable scope="col" $align="right" sort={sort} k="value" onClick={() => toggleSort('value')}>
                  Value
                </ThSortable>
                <ThSortable scope="col" $align="right" sort={sort} k="gain" onClick={() => toggleSort('gain')}>
                  Total return
                </ThSortable>
                <Th scope="col" $align="right" aria-label="Trend">
                  Trend
                </Th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((h) => (
                <HoldingRow key={h.id} holding={h} />
              ))}
            </tbody>
          </Table>
        </TableScroll>
      </Card>
    </Page>
  );
}

function readSortValue(h: Holding, k: SortKey): number | string {
  switch (k) {
    case 'name':
      return h.name.toLowerCase();
    case 'assetClass':
      return h.assetClass;
    case 'quantity':
      return h.quantity;
    case 'price':
      return h.price;
    case 'value':
      return h.quantity * h.price;
    case 'gain':
      return (h.price - h.costBasis) * h.quantity;
    case 'dayChangePct':
      return h.dayChangePct;
  }
}

function HoldingRow({ holding }: { holding: Holding }) {
  // Per-row memoised selector — Recommended RTK pattern for parameterised selectors.
  const sparkSelector = useMemo(() => makeSelectSparkline(holding.symbol), [holding.symbol]);
  const ticks = useSelector((s: RootState) => sparkSelector(s));

  const value = holding.quantity * holding.price;
  const gain = (holding.price - holding.costBasis) * holding.quantity;
  const gainPct = holding.costBasis > 0 ? (holding.price - holding.costBasis) / holding.costBasis : 0;

  return (
    <Tr>
      <Td $align="left">
        <NameCell>
          <SymbolBadge>{holding.symbol.slice(0, 4)}</SymbolBadge>
          <NameStack>
            <NameMain>{holding.name}</NameMain>
            <NameSub>{holding.symbol}</NameSub>
          </NameStack>
        </NameCell>
      </Td>
      <Td $align="left">
        <Badge tone={toneForAssetClass(holding.assetClass)}>
          {ASSET_CLASS_LABEL[holding.assetClass] ?? holding.assetClass}
        </Badge>
      </Td>
      <Td $align="right">{formatNumber(holding.quantity, holding.assetClass === 'cash' ? 0 : 2)}</Td>
      <Td $align="right">{formatMoney(holding.price)}</Td>
      <Td $align="right">
        <Pct $positive={holding.dayChangePct >= 0}>
          {formatPercent(holding.dayChangePct)}
        </Pct>
      </Td>
      <Td $align="right">
        <strong>{formatMoney(value)}</strong>
      </Td>
      <Td $align="right">
        <ReturnStack>
          <span>{formatMoney(gain, { signed: true })}</span>
          <Pct $positive={gain >= 0}>{formatPercent(gainPct)}</Pct>
        </ReturnStack>
      </Td>
      <Td $align="right">
        <Sparkline ticks={ticks} />
      </Td>
    </Tr>
  );
}

function toneForAssetClass(c: Holding['assetClass']) {
  switch (c) {
    case 'equity':
      return 'brand';
    case 'fixed_income':
      return 'info';
    case 'cash':
      return 'neutral';
    case 'alternative':
      return 'warn';
    case 'crypto':
      return 'success';
  }
}

interface ThSortableProps {
  k: SortKey;
  sort: { key: SortKey; dir: SortDir };
  onClick: () => void;
  scope: 'col';
  $align: 'left' | 'right';
  children: React.ReactNode;
}

function ThSortable({ k, sort, onClick, $align, children, scope }: ThSortableProps) {
  const active = sort.key === k;
  const ariaSort: 'ascending' | 'descending' | 'none' = active
    ? sort.dir === 'asc'
      ? 'ascending'
      : 'descending'
    : 'none';
  return (
    <Th scope={scope} $align={$align} aria-sort={ariaSort}>
      <SortBtn type="button" onClick={onClick} $active={active}>
        {children}
        <SortIcon aria-hidden="true">
          {active ? (sort.dir === 'asc' ? '↑' : '↓') : '↕'}
        </SortIcon>
      </SortBtn>
    </Th>
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

const TableScroll = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.fontSize.sm};

  thead tr {
    background: ${({ theme }) => theme.color.surfaceAlt};
    border-bottom: 1px solid ${({ theme }) => theme.color.border};
  }
`;

const cellCss = css<{ $align: 'left' | 'right' }>`
  padding: ${({ theme }) => `${theme.space[3]} ${theme.space[4]}`};
  text-align: ${({ $align }) => $align};
  vertical-align: middle;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
`;

const Th = styled.th<{ $align: 'left' | 'right' }>`
  ${cellCss}
  font-weight: ${({ theme }) => theme.fontWeight.medium};
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.color.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.04em;
`;

const SortBtn = styled.button<{ $active: boolean }>`
  appearance: none;
  background: transparent;
  border: none;
  padding: 0;
  font: inherit;
  text-transform: inherit;
  letter-spacing: inherit;
  color: ${({ $active, theme }) => ($active ? theme.color.text : 'inherit')};
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;

  &:hover {
    color: ${({ theme }) => theme.color.text};
  }
`;

const SortIcon = styled.span`
  font-size: 11px;
  opacity: 0.7;
`;

const Tr = styled.tr`
  border-bottom: 1px solid ${({ theme }) => theme.color.border};

  &:last-child {
    border-bottom: none;
  }

  &:hover {
    background: ${({ theme }) => theme.color.surfaceAlt};
  }
`;

const Td = styled.td<{ $align: 'left' | 'right' }>`
  ${cellCss}
`;

const NameCell = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  min-width: 220px;
`;

const SymbolBadge = styled.div`
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radius.sm};
  background: ${({ theme }) => theme.color.surfaceAlt};
  display: grid;
  place-items: center;
  font-size: 11px;
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  font-family: ${({ theme }) => theme.font.mono};
  color: ${({ theme }) => theme.color.text};
  flex-shrink: 0;
`;

const NameStack = styled.div`
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const NameMain = styled.div`
  font-weight: ${({ theme }) => theme.fontWeight.medium};
  color: ${({ theme }) => theme.color.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 240px;
`;

const NameSub = styled.div`
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.color.textMuted};
`;

const Pct = styled.span<{ $positive: boolean }>`
  color: ${({ $positive, theme }) =>
    $positive ? theme.color.success : theme.color.danger};
  font-weight: ${({ theme }) => theme.fontWeight.medium};
`;

const ReturnStack = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
`;
