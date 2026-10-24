import { Link } from 'react-router-dom';
import styled from 'styled-components';

interface BrandLogoProps {
  /** Hide the "FinVision" word (e.g. collapsed sidebar). */
  compact?: boolean;
  to?: string;
  size?: number;
}

/** The FinVision mark: a rising trend line on a blue-to-green tile. */
export function BrandMark({ size = 30 }: { size?: number }) {
  return (
    <Mark aria-hidden="true" style={{ width: size, height: size, borderRadius: size * 0.3 }}>
      <svg viewBox="0 0 24 24" width={size * 0.6} height={size * 0.6}>
        <path d="M3 17l5-5 4 4 8-9" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Mark>
  );
}

export function BrandLogo({ compact = false, to = '/welcome', size = 30 }: BrandLogoProps) {
  return (
    <Root to={to} aria-label="FinVision home">
      <BrandMark size={size} />
      {!compact && <Word>FinVision</Word>}
    </Root>
  );
}

const Root = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[2]};
  color: ${({ theme }) => theme.color.text};
  text-decoration: none;
  &:hover { text-decoration: none; }
`;

const Mark = styled.span`
  display: grid;
  place-items: center;
  flex-shrink: 0;
  color: #fff;
  background: linear-gradient(135deg, ${({ theme }) => theme.color.primary}, ${({ theme }) => theme.color.success});
`;

const Word = styled.span`
  font-weight: ${({ theme }) => theme.fontWeight.bold};
  font-size: ${({ theme }) => theme.fontSize.md};
  letter-spacing: -0.01em;
`;
