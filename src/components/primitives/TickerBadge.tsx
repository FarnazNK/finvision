import styled from 'styled-components';

interface TickerBadgeProps {
  symbol: string;
  size?: number;
}

/**
 * Square ticker avatar. Strips punctuation (BRK.B → BRKB) and shrinks the text
 * for longer symbols so it always fits inside the tile.
 */
export function TickerBadge({ symbol, size = 36 }: TickerBadgeProps) {
  const text = symbol.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4);
  const fontSize = text.length <= 3 ? size * 0.32 : size * 0.27;
  return (
    <Tile aria-hidden="true" style={{ width: size, height: size, fontSize }}>
      {text}
    </Tile>
  );
}

const Tile = styled.span`
  display: grid;
  place-items: center;
  flex-shrink: 0;
  border-radius: ${({ theme }) => theme.radius.md};
  background: color-mix(in srgb, ${({ theme }) => theme.color.primary} 9%, ${({ theme }) => theme.color.surfaceAlt});
  color: ${({ theme }) => theme.color.text};
  font-family: ${({ theme }) => theme.font.mono};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  letter-spacing: -0.02em;
  line-height: 1;
`;
