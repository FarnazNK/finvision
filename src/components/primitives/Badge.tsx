import type { HTMLAttributes, ReactNode } from 'react';
import styled, { css } from 'styled-components';

export type BadgeTone = 'neutral' | 'success' | 'warn' | 'danger' | 'info' | 'brand';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  children: ReactNode;
}

export function Badge({ tone = 'neutral', children, ...rest }: BadgeProps) {
  return (
    <Root $tone={tone} {...rest}>
      {children}
    </Root>
  );
}

const tones = {
  neutral: css`
    color: ${({ theme }) => theme.color.textMuted};
    background: ${({ theme }) => theme.color.surfaceAlt};
    border-color: ${({ theme }) => theme.color.border};
  `,
  brand: css`
    color: ${({ theme }) => theme.color.primary};
    background: color-mix(in srgb, ${({ theme }) => theme.color.primary} 12%, transparent);
    border-color: color-mix(in srgb, ${({ theme }) => theme.color.primary} 28%, transparent);
  `,
  success: css`
    color: ${({ theme }) => theme.color.success};
    background: color-mix(in srgb, ${({ theme }) => theme.color.success} 12%, transparent);
    border-color: color-mix(in srgb, ${({ theme }) => theme.color.success} 28%, transparent);
  `,
  warn: css`
    color: ${({ theme }) => theme.color.warn};
    background: color-mix(in srgb, ${({ theme }) => theme.color.warn} 12%, transparent);
    border-color: color-mix(in srgb, ${({ theme }) => theme.color.warn} 28%, transparent);
  `,
  danger: css`
    color: ${({ theme }) => theme.color.danger};
    background: color-mix(in srgb, ${({ theme }) => theme.color.danger} 12%, transparent);
    border-color: color-mix(in srgb, ${({ theme }) => theme.color.danger} 28%, transparent);
  `,
  info: css`
    color: ${({ theme }) => theme.color.info};
    background: color-mix(in srgb, ${({ theme }) => theme.color.info} 12%, transparent);
    border-color: color-mix(in srgb, ${({ theme }) => theme.color.info} 28%, transparent);
  `,
};

const Root = styled.span<{ $tone: BadgeTone }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.space[1]};
  padding: 2px ${({ theme }) => theme.space[2]};
  font-size: ${({ theme }) => theme.fontSize.xs};
  font-weight: ${({ theme }) => theme.fontWeight.medium};
  border-radius: ${({ theme }) => theme.radius.pill};
  border: 1px solid;
  ${({ $tone }) => tones[$tone]}
`;
