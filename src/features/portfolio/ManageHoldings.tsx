/**
 * Add and remove saved holdings for a signed-in user.
 *
 * Amounts are sent as the exact strings typed in, so the server stores the
 * decimal the user entered rather than a rounded binary float.
 */
import { type ChangeEvent, type FormEvent, useState } from 'react';
import styled from 'styled-components';
import { useAppDispatch, useAppSelector } from '@/app/hooks';
import { Button, Card, Input } from '@/components/primitives';
import { ASSET_CLASS_LABEL, formatNumber } from '@/utils/format';
import type { AssetClass } from '@/types/domain';
import {
  addAccountHolding,
  removeAccountHolding,
  selectHoldings,
  selectPortfolioError,
  selectPortfolioLoading,
} from './portfolioSlice';

const DECIMAL = /^\d+(\.\d+)?$/;
const ASSET_CLASSES = Object.keys(ASSET_CLASS_LABEL) as AssetClass[];

const EMPTY_FORM = {
  symbol: '',
  name: '',
  assetClass: 'equity' as AssetClass,
  quantity: '',
  costBasis: '',
};

export function ManageHoldings() {
  const dispatch = useAppDispatch();
  const holdings = useAppSelector(selectHoldings);
  const loading = useAppSelector(selectPortfolioLoading);
  const serverError = useAppSelector(selectPortfolioError);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const update = (field: keyof typeof EMPTY_FORM) => (value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    const quantity = form.quantity.trim();
    const costBasis = form.costBasis.trim();
    if (!form.symbol.trim() || !form.name.trim()) {
      setFormError('Enter a symbol and a name.');
      return;
    }
    if (!DECIMAL.test(quantity) || Number(quantity) <= 0) {
      setFormError('Quantity must be a positive number, like 10 or 0.5.');
      return;
    }
    if (!DECIMAL.test(costBasis)) {
      setFormError('Cost per unit must be a number, like 182.40.');
      return;
    }
    setFormError(null);
    const result = await dispatch(
      addAccountHolding({
        symbol: form.symbol.trim().toUpperCase(),
        name: form.name.trim(),
        assetClass: form.assetClass,
        quantity,
        costBasis,
      }),
    );
    if (addAccountHolding.fulfilled.match(result)) setForm(EMPTY_FORM);
  }

  return (
    <Card
      title="Manage holdings"
      description="Saved to your account. Prices come from the market feed when available, otherwise positions are valued at cost."
    >
      <Form onSubmit={submit} aria-label="Add a holding" noValidate>
        <Input label="Symbol" value={form.symbol} onChange={(e) => update('symbol')(e.target.value)} placeholder="AAPL" maxLength={20} />
        <Input label="Name" value={form.name} onChange={(e) => update('name')(e.target.value)} placeholder="Apple Inc." maxLength={200} />
        <SelectField>
          <SelectLabel htmlFor="holding-asset-class">Asset class</SelectLabel>
          <Select
            id="holding-asset-class"
            value={form.assetClass}
            onChange={(e: ChangeEvent<HTMLSelectElement>) => update('assetClass')(e.target.value)}
          >
            {ASSET_CLASSES.map((c) => (
              <option key={c} value={c}>{ASSET_CLASS_LABEL[c]}</option>
            ))}
          </Select>
        </SelectField>
        <Input label="Quantity" inputMode="decimal" value={form.quantity} onChange={(e) => update('quantity')(e.target.value)} placeholder="10" />
        <Input label="Cost per unit" inputMode="decimal" value={form.costBasis} onChange={(e) => update('costBasis')(e.target.value)} placeholder="182.40" />
        <Submit>
          <Button type="submit" disabled={loading}>{loading ? 'Saving…' : 'Add holding'}</Button>
        </Submit>
      </Form>

      {(formError ?? serverError) && <ErrorText role="alert">{formError ?? serverError}</ErrorText>}

      {holdings.length === 0 ? (
        <Empty>No holdings yet. Add your first position above.</Empty>
      ) : (
        <List aria-label="Saved holdings">
          {holdings.map((h) => (
            <Row key={h.id}>
              <span>
                <strong>{h.symbol}</strong> · {formatNumber(h.quantity)} units
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={loading}
                onClick={() => void dispatch(removeAccountHolding(h.id))}
                aria-label={`Remove ${h.symbol}`}
              >
                Remove
              </Button>
            </Row>
          ))}
        </List>
      )}
    </Card>
  );
}

const Form = styled.form`
  display: grid;
  gap: ${({ theme }) => theme.space[3]};
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  align-items: end;
`;

const SelectField = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
`;

const SelectLabel = styled.label`
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: ${({ theme }) => theme.fontWeight.medium};
  color: ${({ theme }) => theme.color.text};
`;

const Select = styled.select`
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[3]}`};
  border-radius: ${({ theme }) => theme.radius.md};
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.text};
  font-size: ${({ theme }) => theme.fontSize.sm};
  min-height: 38px;
`;

const Submit = styled.div`
  display: flex;
`;

const ErrorText = styled.p`
  margin: ${({ theme }) => theme.space[3]} 0 0;
  color: ${({ theme }) => theme.color.danger};
  font-size: ${({ theme }) => theme.fontSize.sm};
`;

const Empty = styled.p`
  margin: ${({ theme }) => theme.space[4]} 0 0;
  color: ${({ theme }) => theme.color.textMuted};
  font-size: ${({ theme }) => theme.fontSize.sm};
`;

const List = styled.ul`
  list-style: none;
  margin: ${({ theme }) => theme.space[4]} 0 0;
  padding: 0;
  display: grid;
  gap: ${({ theme }) => theme.space[2]};
`;

const Row = styled.li`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: ${({ theme }) => theme.space[3]};
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[3]}`};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.md};
  font-size: ${({ theme }) => theme.fontSize.sm};
`;
