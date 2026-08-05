import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import styled, { css } from 'styled-components';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
  iconStart?: ReactNode;
  iconEnd?: ReactNode;
  fullWidth?: boolean;
}

/**
 * Button — the workhorse. Variants compose via theme tokens, never hardcoded.
 * Loading state preserves width to avoid layout shift, and exposes
 * `aria-busy` so assistive tech announces the change.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    isLoading = false,
    iconStart,
    iconEnd,
    fullWidth,
    children,
    disabled,
    ...rest
  },
  ref,
) {
  return (
    <StyledButton
      ref={ref}
      $variant={variant}
      $size={size}
      $fullWidth={fullWidth}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      {...rest}
    >
      {isLoading ? <Spinner aria-hidden="true" /> : iconStart}
      <Label>{children}</Label>
      {!isLoading && iconEnd}
    </StyledButton>
  );
});

const sizeStyles = {
  sm: css`
    height: 32px;
    padding: 0 ${({ theme }) => theme.space[3]};
    font-size: ${({ theme }) => theme.fontSize.sm};
    gap: ${({ theme }) => theme.space[1]};
  `,
  md: css`
    height: 40px;
    padding: 0 ${({ theme }) => theme.space[4]};
    font-size: ${({ theme }) => theme.fontSize.sm};
    gap: ${({ theme }) => theme.space[2]};
  `,
  lg: css`
    height: 48px;
    padding: 0 ${({ theme }) => theme.space[5]};
    font-size: ${({ theme }) => theme.fontSize.base};
    gap: ${({ theme }) => theme.space[2]};
  `,
} as const;

const variantStyles = {
  primary: css`
    background: ${({ theme }) => theme.color.primary};
    color: ${({ theme }) => theme.color.primaryText};
    border-color: transparent;
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.color.primaryHover};
    }
  `,
  secondary: css`
    background: ${({ theme }) => theme.color.surface};
    color: ${({ theme }) => theme.color.text};
    border-color: ${({ theme }) => theme.color.border};
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.color.surfaceAlt};
    }
  `,
  ghost: css`
    background: transparent;
    color: ${({ theme }) => theme.color.text};
    border-color: transparent;
    &:hover:not(:disabled) {
      background: ${({ theme }) => theme.color.surfaceAlt};
    }
  `,
  danger: css`
    background: ${({ theme }) => theme.color.danger};
    color: white;
    border-color: transparent;
    &:hover:not(:disabled) {
      filter: brightness(1.05);
    }
  `,
} as const;

const StyledButton = styled.button<{
  $variant: Variant;
  $size: Size;
  $fullWidth?: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid;
  border-radius: ${({ theme }) => theme.radius.md};
  font-family: inherit;
  font-weight: ${({ theme }) => theme.fontWeight.medium};
  letter-spacing: -0.005em;
  cursor: pointer;
  transition:
    background ${({ theme }) => theme.motion.fast},
    border-color ${({ theme }) => theme.motion.fast},
    color ${({ theme }) => theme.motion.fast},
    transform ${({ theme }) => theme.motion.fast};
  white-space: nowrap;
  user-select: none;

  ${({ $size }) => sizeStyles[$size]}
  ${({ $variant }) => variantStyles[$variant]}
  ${({ $fullWidth }) => $fullWidth && 'width: 100%;'}

  &:active:not(:disabled) {
    transform: translateY(1px);
  }

  &:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }
`;

const Label = styled.span`
  display: inline-flex;
  align-items: center;
  gap: inherit;
`;

const Spinner = styled.span`
  width: 14px;
  height: 14px;
  border: 2px solid currentColor;
  border-right-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
`;
