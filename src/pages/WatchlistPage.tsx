import { useState, type FormEvent } from 'react';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import {
  selectWatchlist,
  watchlistItemAdded,
  watchlistItemRemoved,
} from '@/features/watchlist/watchlistSlice';
import { Button, Card, Input } from '@/components/primitives';
import { formatRelativeTime } from '@/utils/format';
import { media } from '@/utils/responsive';

export function WatchlistPage() {
  const dispatch = useAppDispatch();
  const items = useAppSelector(selectWatchlist);
  const [symbol, setSymbol] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    const sym = symbol.trim().toUpperCase();
    const nm = name.trim() || sym;
    if (!sym) {
      setError('Symbol is required.');
      return;
    }
    if (items.some((i) => i.symbol === sym)) {
      setError(`${sym} is already on your watchlist.`);
      return;
    }
    dispatch(watchlistItemAdded({ symbol: sym, name: nm }));
    setSymbol('');
    setName('');
    setError(null);
  };

  return (
    <Page>
      <PageHeader>
        <div>
          <Eyebrow>Watchlist</Eyebrow>
          <Title>Tracking {items.length} {items.length === 1 ? 'symbol' : 'symbols'}</Title>
          <Subtitle>Symbols you follow but don't yet own.</Subtitle>
        </div>
      </PageHeader>

      <Card title="Add a symbol" description="Use the ticker as displayed by your exchange.">
        <AddRow onSubmit={handleAdd} noValidate>
          <SymbolField>
            <Input
              label="Symbol"
              placeholder="e.g. AMZN"
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              maxLength={8}
              autoCapitalize="characters"
              autoComplete="off"
              error={error}
            />
          </SymbolField>
          <NameField>
            <Input
              label="Name (optional)"
              placeholder="Amazon.com, Inc."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="off"
            />
          </NameField>
          <Submit>
            <Button type="submit">Add to watchlist</Button>
          </Submit>
        </AddRow>
      </Card>

      <Card title="Your watchlist" padded={false}>
        {items.length === 0 ? (
          <Empty role="status">
            <EmptyTitle>Nothing here yet</EmptyTitle>
            <EmptyHint>Add a symbol above to start tracking.</EmptyHint>
          </Empty>
        ) : (
          <List>
            {items.map((item) => (
              <Row key={item.symbol}>
                <Sym aria-hidden="true">{item.symbol.slice(0, 4)}</Sym>
                <Stack>
                  <Main>{item.name}</Main>
                  <Sub>
                    {item.symbol} · added {formatRelativeTime(item.addedAt)}
                  </Sub>
                </Stack>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => dispatch(watchlistItemRemoved(item.symbol))}
                  aria-label={`Remove ${item.symbol} from watchlist`}
                >
                  Remove
                </Button>
              </Row>
            ))}
          </List>
        )}
      </Card>
    </Page>
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

const AddRow = styled.form`
  display: grid;
  gap: ${({ theme }) => theme.space[3]};
  grid-template-columns: 1fr;
  align-items: end;

  ${media.md`grid-template-columns: 160px 1fr auto;`}
`;

const SymbolField = styled.div``;
const NameField = styled.div``;
const Submit = styled.div``;

const List = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const Row = styled.li`
  display: grid;
  grid-template-columns: 36px 1fr auto;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => `${theme.space[3]} ${theme.space[4]}`};
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
