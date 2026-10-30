import type { HTMLAttributes, ReactNode } from 'react';
import styled from 'styled-components';
import { glassInteractive } from '@/theme/glass';

interface CardProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  /** Renders a header bar above children. Title alone is sufficient; actions optional. */
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Use a `<section>` with aria-labelledby when a title is provided — the default. */
  as?: 'section' | 'article' | 'div';
  padded?: boolean;
}

let cardSeq = 0;

export function Card({
  title,
  description,
  actions,
  children,
  as = 'section',
  padded = true,
  ...rest
}: CardProps) {
  const headingId = title ? `card-h-${++cardSeq}` : undefined;
  return (
    <Root as={as} aria-labelledby={headingId} {...rest}>
      {(title || actions) && (
        <Header>
          <HeaderText>
            {title && <Title id={headingId}>{title}</Title>}
            {description && <Description>{description}</Description>}
          </HeaderText>
          {actions && <Actions>{actions}</Actions>}
        </Header>
      )}
      <Body $padded={padded}>{children}</Body>
    </Root>
  );
}

const Root = styled.section`
  ${glassInteractive}
  border-radius: ${({ theme }) => theme.radius.lg};
  display: flex;
  flex-direction: column;
  min-width: 0;
`;

const Header = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.space[4]};
  padding: ${({ theme }) => `${theme.space[5]} ${theme.space[6]} ${theme.space[4]}`};
  border-bottom: 1px solid ${({ theme }) => theme.color.border};
  border-image: linear-gradient(90deg, transparent, ${({ theme }) => theme.color.borderStrong} 20%, ${({ theme }) => theme.color.borderStrong} 80%, transparent) 1;

  @media (max-width: 520px) {
    padding: ${({ theme }) => `${theme.space[4]} ${theme.space[4]}`};
  }
`;

const HeaderText = styled.div`
  min-width: 0;
  flex: 1 1 160px;
`;

const Title = styled.h2`
  font-size: ${({ theme }) => theme.fontSize.md};
  font-weight: ${({ theme }) => theme.fontWeight.semibold};
  color: ${({ theme }) => theme.color.text};
  letter-spacing: -0.015em;
  margin: 0;
`;

const Description = styled.p`
  margin-top: ${({ theme }) => theme.space[1]};
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.color.textMuted};
`;

const Actions = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.space[2]};
  flex-shrink: 0;
`;

const Body = styled.div<{ $padded: boolean }>`
  padding: ${({ $padded, theme }) => ($padded ? theme.space[6] : '0')};
  flex: 1;
  min-width: 0;
`;
