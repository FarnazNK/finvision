import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  filterChanged,
  searchChanged,
  selectFilteredTransactions,
  selectTxFilter,
  selectTxSearch,
  type TxFilter,
} from '@/features/transactions/transactionsSlice';
import { Badge, Card, Input, SegmentedControl } from '@/components/primitives';
import { formatDate, formatMoney } from '@/utils/format';
import { media } from '@/utils/responsive';
import type { BadgeTone } from '@/components/primitives/Badge';
import type { Transaction } from '@/types/domain';

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'buy', label: 'Buys' },
  { value: 'sell', label: 'Sells' },
  { value: 'dividend', label: 'Dividends' },
  { value: 'deposit', label: 'Deposits' },
  { value: 'withdrawal', label: 'Withdrawals' },
  { value: 'fee', label: 'Fees' },
] as const;

export function TransactionsPage() {
  const dispatch = useAppDispatch();
  const filter = useAppSelector(selectTxFilter);
  const search = useAppSelector(selectTxSearch);
  const items = useAppSelector(selectFilteredTransactions);

  return (
    <Page>
      <PageHeader>
        <div>
          <Eyebrow>Transactions</Eyebrow>
          <Title>{items.length} {items.length === 1 ? 'transaction' : 'transactions'}</Title>
          <Subtitle>All buys, sells, dividends, and cash movement.</Subtitle>
        </div>
      </PageHeader>

      <Toolbar>
        <SearchWrap>
          <Input
            label="Search transactions"
            hideLabel
            placeholder="Search by symbol, type, or description"
            value={search}
            onChange={(e) => dispatch(searchChanged(e.target.value))}
            iconStart={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            }
          />
        </SearchWrap>
        <FilterScroll>
          <SegmentedControl
            label="Filter by type"
            size="sm"
            value={filter}
            onChange={(v) => dispatch(filterChanged(v as TxFilter))}
            options={FILTER_OPTIONS}
          />
        </FilterScroll>
      </Toolbar>

      <Card padded={false}>
        {items.length === 0 ? (
          <Empty role="status">
            <EmptyTitle>No transactions match</EmptyTitle>
            <EmptyHint>Try clearing your filter or search term.</EmptyHint>
          </Empty>
        ) : (
          <TableScroll>
            <Table aria-label="Transactions">
              <thead>
                <tr>
                  <Th $align="left">Date</Th>
                  <Th $align="left">Type</Th>
                  <Th $align="left">Description</Th>
                  <Th $align="left">Symbol</Th>
                  <Th $align="left">Status</Th>
                  <Th $align="right">Amount</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((tx) => (
                  <Tr key={tx.id}>
                    <Td $align="left">{formatDate(tx.date, 'medium')}</Td>
                    <Td $align="left">
                      <Badge tone={toneForType(tx.type)}>{labelForType(tx.type)}</Badge>
                    </Td>
                    <Td $align="left">{tx.description}</Td>
                    <Td $align="left"><Mono>{tx.symbol ?? '—'}</Mono></Td>
                    <Td $align="left">
                      <Badge tone={tx.status === 'settled' ? 'success' : tx.status === 'pending' ? 'warn' : 'danger'}>
                        {tx.status}
                      </Badge>
                    </Td>
                    <Td $align="right">
                      <Amount $positive={tx.amount >= 0}>
                        {formatMoney(tx.amount, { signed: true })}
                      </Amount>
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </TableScroll>
        )}
      </Card>
    </Page>
  );
}

function labelForType(t: Transaction['type']): string {
  return { buy: 'Buy', sell: 'Sell', dividend: 'Dividend', deposit: 'Deposit', withdrawal: 'Withdrawal', fee: 'Fee' }[t];
}

function toneForType(t: Transaction['type']): BadgeTone {
  switch (t) {
    case 'buy':
      return 'brand';
    case 'sell':
      return 'info';
    case 'dividend':
      return 'success';
    case 'deposit':
      return 'success';
    case 'withdrawal':
      return 'warn';
    case 'fee':
      return 'danger';
  }
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

const Toolbar = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[3]};
  ${media.md`
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
  `}
`;

const SearchWrap = styled.div`
  flex: 1;
  max-width: 480px;
`;

const FilterScroll = styled.div`
  overflow-x: auto;
  flex-shrink: 0;
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

const Th = styled.th<{ $align: 'left' | 'right' }>`
  padding: ${({ theme }) => `${theme.space[3]} ${theme.space[4]}`};
  text-align: ${({ $align }) => $align};
  font-weight: ${({ theme }) => theme.fontWeight.medium};
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.color.textMuted};
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
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
  padding: ${({ theme }) => `${theme.space[3]} ${theme.space[4]}`};
  text-align: ${({ $align }) => $align};
  vertical-align: middle;
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.color.text};
`;

const Mono = styled.span`
  font-family: ${({ theme }) => theme.font.mono};
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.fontSize.xs};
`;

const Amount = styled.span<{ $positive: boolean }>`
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ $positive, theme }) =>
    $positive ? theme.color.success : theme.color.text};
`;

const Empty = styled.div`
  padding: ${({ theme }) => theme.space[12]};
  text-align: center;
`;

const EmptyTitle = styled.div`
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ theme }) => theme.color.text};
  font-size: ${({ theme }) => theme.fontSize.md};
`;

const EmptyHint = styled.div`
  margin-top: ${({ theme }) => theme.space[2]};
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.color.textMuted};
`;
