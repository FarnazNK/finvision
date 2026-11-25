/**
 * Renders an assistant answer with number-level citations.
 *
 * Every figure the backend verified (citation kind "figure") is marked in the
 * text with a footnote number, and the footnotes list which tool and field the
 * number came from, plus the raw value there. Anything the backend could not
 * verify never reaches this component: it retries or answers deterministically.
 */
import { Fragment } from 'react';
import styled from 'styled-components';

import type { Citation, InsightsResponse } from '@/services/schemas';

type Figure = Citation & { text: string };

const GUARDRAIL_LABELS: Record<string, string> = {
  'refused:advice': 'Investment advice declined',
  'refused:off_topic': 'Outside what this assistant covers',
  'refused:injection': 'Instruction override blocked',
  'fallback:offline': 'Offline mode: computed directly',
  'fallback:api_error': 'Model unavailable: computed directly',
  'fallback:timeout': 'Model timed out: computed directly',
  'fallback:unverified_numbers': 'Model figures failed verification: computed directly',
  'fallback:advice_in_output': 'Computed directly',
  'fallback:step_limit': 'Computed directly',
};

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function formatSource(c: Figure) {
  const tool = c.ref === 'portfolio_snapshot' ? 'portfolio input' : c.ref;
  const value = c.value === null || c.value === undefined ? '' : ` = ${c.value}`;
  return `${tool}${c.path ? ` → ${c.path}` : ''}${value}`;
}

export function guardrailLabel(guardrail?: string | null) {
  if (!guardrail) return null;
  return GUARDRAIL_LABELS[guardrail] ?? guardrail;
}

export function CitedAnswer({ result }: { result: InsightsResponse }) {
  const figures = result.citations.filter(
    (c): c is Figure => c.kind === 'figure' && !!c.text,
  );
  const tools = result.citations.filter((c) => c.kind === 'metric').map((c) => c.ref);
  const label = guardrailLabel(result.guardrail);

  const index = new Map(figures.map((f, i) => [f.text, i]));
  const parts = figures.length
    ? result.answer.split(
        new RegExp(
          `(${[...index.keys()]
            .sort((a, b) => b.length - a.length)
            .map(escapeRegExp)
            .join('|')})`,
        ),
      )
    : [result.answer];

  return (
    <Wrap role="status" aria-live="polite">
      {label && <Flag data-kind={result.guardrail?.split(':')[0]}>{label}</Flag>}
      <p>
        {parts.map((part, i) => {
          const n = index.get(part);
          if (n === undefined) return <Fragment key={i}>{part}</Fragment>;
          return (
            <Fig key={i} title={formatSource(figures[n])}>
              {part}
              <sup>
                <a href={`#insight-src-${n + 1}`} aria-label={`source ${n + 1}`}>
                  {n + 1}
                </a>
              </sup>
            </Fig>
          );
        })}
      </p>

      {figures.length > 0 && (
        <Sources aria-label="Sources for each figure">
          {figures.map((f, i) => (
            <li key={f.text} id={`insight-src-${i + 1}`}>
              <strong>{f.text}</strong> <code>{formatSource(f)}</code>
            </li>
          ))}
        </Sources>
      )}

      <Meta>
        model: {result.model}
        {tools.length > 0 && ` · grounded in ${tools.join(', ')}`}
      </Meta>
    </Wrap>
  );
}

const Wrap = styled.div`
  margin-top: 16px;
  padding: 14px;
  border-radius: 8px;
  background: ${({ theme }) => theme.color.surfaceAlt ?? theme.color.surface};
  border: 1px solid ${({ theme }) => theme.color.border};
  p { margin: 0; line-height: 1.6; color: ${({ theme }) => theme.color.text}; }
`;

const Fig = styled.mark`
  background: transparent;
  color: inherit;
  font-weight: 600;
  border-bottom: 1px dotted ${({ theme }) => theme.color.accent};
  sup { margin-left: 1px; font-size: 10px; font-weight: 500; }
  a { color: ${({ theme }) => theme.color.accent}; text-decoration: none; }
`;

const Flag = styled.div`
  display: inline-block;
  margin-bottom: 8px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 11px;
  border: 1px solid ${({ theme }) => theme.color.border};
  color: ${({ theme }) => theme.color.textMuted};
`;

const Sources = styled.ol`
  margin: 12px 0 0;
  padding-left: 18px;
  font-size: 12px;
  color: ${({ theme }) => theme.color.textMuted};
  li { margin: 2px 0; }
  code { font-size: 11px; }
`;

const Meta = styled.div`
  margin-top: 10px;
  font-size: 11px;
  color: ${({ theme }) => theme.color.textMuted};
`;
