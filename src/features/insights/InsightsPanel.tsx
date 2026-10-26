/**
 * Portfolio Insights — natural-language Q&A over the user's holdings.
 *
 * Reads the live portfolio/transaction state straight from the app store and
 * posts it to the AI service, so answers are grounded in the exact account the
 * user is looking at. The panel's own session state (question, request status,
 * recent questions) lives in a Zustand store; see insightsStore.ts.
 */
import { useRef, type ChangeEvent, type KeyboardEvent } from 'react';
import styled from 'styled-components';

import { useAppStore } from '@/app/hooks';
import { selectCurrency } from '@/features/ui/uiSlice';
import { Card } from '@/components/primitives/Card';
import { selectHoldings } from '@/features/portfolio/portfolioSlice';
import { selectTransactions } from '@/features/transactions/transactionsSlice';
import { askInsight } from '@/services/insightsClient';
import { useInsightsStore } from './insightsStore';

const SUGGESTIONS = [
  'How is my portfolio doing overall?',
  'Am I over-concentrated in any position?',
  'What was my biggest mover today?',
  'Summarize my recent activity.',
];

export function InsightsPanel() {
  const holdings = useAppStore(selectHoldings);
  const transactions = useAppStore(selectTransactions);
  const currency = useAppStore(selectCurrency);

  const question = useInsightsStore((s) => s.question);
  const status = useInsightsStore((s) => s.status);
  const result = useInsightsStore((s) => s.result);
  const error = useInsightsStore((s) => s.error);
  const history = useInsightsStore((s) => s.history);
  const setQuestion = useInsightsStore((s) => s.setQuestion);
  const requestStarted = useInsightsStore((s) => s.requestStarted);
  const requestSucceeded = useInsightsStore((s) => s.requestSucceeded);
  const requestFailed = useInsightsStore((s) => s.requestFailed);
  const requestCancelled = useInsightsStore((s) => s.requestCancelled);
  const abortRef = useRef<AbortController | null>(null);
  const loading = status === 'loading';

  async function run(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    requestStarted(trimmed);
    try {
      const res = await askInsight(
        trimmed,
        holdings,
        transactions,
        currency,
        controller.signal,
      );
      requestSucceeded(res);
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        requestCancelled();
      } else {
        requestFailed('Insights are temporarily unavailable. Please try again in a moment.');
      }
    }
  }

  const recent = history.filter((q) => !SUGGESTIONS.includes(q));

  return (
    <Card
      title="Portfolio Insights"
      description="Ask about the portfolio shown here. Answers use its holdings and transactions; demo prices are simulated."
    >
      <Row>
        <Field
          value={question}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setQuestion(e.target.value)}
          onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && run(question)}
          placeholder="e.g. Am I too concentrated in tech?"
          aria-label="Ask about your portfolio"
        />
        <Ask onClick={() => run(question)} disabled={loading || !question.trim()}>
          {loading ? 'Thinking…' : 'Ask'}
        </Ask>
      </Row>

      <Chips>
        {SUGGESTIONS.map((s) => (
          <Chip key={s} disabled={loading} onClick={() => run(s)}>
            {s}
          </Chip>
        ))}
      </Chips>

      {recent.length > 0 && (
        <Recent aria-label="Recent questions">
          <RecentLabel>Recent</RecentLabel>
          {recent.map((q) => (
            <Chip key={q} disabled={loading} onClick={() => run(q)}>
              {q}
            </Chip>
          ))}
        </Recent>
      )}

      {error && <ErrorText role="alert">{error}</ErrorText>}

      {result && !error && (
        <Answer role="status" aria-live="polite">
          <p>{result.answer}</p>
          <Meta>
            model: {result.model}
            {result.citations.length > 0 &&
              ` · grounded in ${result.citations.map((c) => c.ref).join(', ')}`}
          </Meta>
        </Answer>
      )}
    </Card>
  );
}

const Row = styled.div`
  display: flex;
  gap: 8px;
`;

const Field = styled.input`
  flex: 1;
  min-width: 0;
  padding: 10px 12px;
  border-radius: 8px;
  border: 1px solid ${({ theme }) => theme.color.border};
  background: ${({ theme }) => theme.color.surface};
  color: ${({ theme }) => theme.color.text};
  font-size: 14px;
`;

const Ask = styled.button`
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  background: ${({ theme }) => theme.color.accent};
  color: #fff;
  font-weight: 600;
  cursor: pointer;
  &:disabled { opacity: 0.6; cursor: default; }
`;

const Chips = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 12px;
`;

const Recent = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
`;

const RecentLabel = styled.span`
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: ${({ theme }) => theme.color.textMuted};
`;

const Chip = styled.button`
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.color.border};
  background: transparent;
  color: ${({ theme }) => theme.color.textMuted};
  font-size: 12px;
  cursor: pointer;
  &:hover { color: ${({ theme }) => theme.color.text}; }
  &:disabled { opacity: 0.6; cursor: wait; }
`;

const Answer = styled.div`
  margin-top: 16px;
  padding: 14px;
  border-radius: 8px;
  background: ${({ theme }) => theme.color.surfaceAlt ?? theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.border};
  p { margin: 0; line-height: 1.55; color: ${({ theme }) => theme.color.text}; }
`;

const Meta = styled.div`
  margin-top: 10px;
  font-size: 11px;
  color: ${({ theme }) => theme.color.textMuted};
`;

const ErrorText = styled.p`
  margin-top: 12px;
  color: ${({ theme }) => theme.color.danger ?? '#c0392b'};
  font-size: 13px;
`;
