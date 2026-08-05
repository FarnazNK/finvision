/**
 * Portfolio Insights — natural-language Q&A over the user's holdings.
 *
 * Reads the live portfolio/transaction state straight from the Redux store and
 * posts it to the AI service, so answers are grounded in the exact account the
 * user is looking at. Includes a few suggested prompts to make the feature
 * discoverable.
 */
import { useRef, useState } from 'react';
import styled from 'styled-components';

import { useAppSelector } from '@/app/hooks';
import { Card } from '@/components/primitives/Card';
import { selectHoldings } from '@/features/portfolio/portfolioSlice';
import { selectTransactions } from '@/features/transactions/transactionsSlice';
import { askInsight, type InsightsResponse } from '@/services/insightsClient';

const SUGGESTIONS = [
  'How is my portfolio doing overall?',
  'Am I over-concentrated in any position?',
  'What was my biggest mover today?',
  'Summarize my recent activity.',
];

export function InsightsPanel() {
  const holdings = useAppSelector(selectHoldings);
  const transactions = useAppSelector(selectTransactions);

  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<InsightsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  async function run(q: string) {
    const trimmed = q.trim();
    if (!trimmed || loading) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const res = await askInsight(
        trimmed,
        holdings,
        transactions,
        'USD',
        controller.signal,
      );
      setResult(res);
    } catch (e) {
      if ((e as Error).name !== 'AbortError') {
        setError('Could not reach the insights service. Is ai-service running?');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card
      title="Portfolio Insights"
      description="Ask a question about your holdings — answers are grounded in your live account."
    >
      <Row>
        <Field
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && run(question)}
          placeholder="e.g. Am I too concentrated in tech?"
          aria-label="Ask about your portfolio"
        />
        <Ask onClick={() => run(question)} disabled={loading}>
          {loading ? 'Thinking…' : 'Ask'}
        </Ask>
      </Row>

      <Chips>
        {SUGGESTIONS.map((s) => (
          <Chip key={s} onClick={() => { setQuestion(s); run(s); }}>
            {s}
          </Chip>
        ))}
      </Chips>

      {error && <ErrorText role="alert">{error}</ErrorText>}

      {result && !error && (
        <Answer>
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

const Chip = styled.button`
  padding: 6px 10px;
  border-radius: 999px;
  border: 1px solid ${({ theme }) => theme.color.border};
  background: transparent;
  color: ${({ theme }) => theme.color.textMuted};
  font-size: 12px;
  cursor: pointer;
  &:hover { color: ${({ theme }) => theme.color.text}; }
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
