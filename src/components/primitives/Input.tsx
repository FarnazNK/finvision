import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import styled from 'styled-components';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  /** Visually hide the label while keeping it accessible to screen readers. */
  hideLabel?: boolean;
  iconStart?: ReactNode;
  fullWidth?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, hideLabel, iconStart, fullWidth = true, id, ...rest },
  ref,
) {
  const generatedId = useId();
  const inputId = id ?? `in-${generatedId}`;
  // The hint is only rendered when there's no error, so its id only belongs
  // in aria-describedby in that case. Otherwise we'd be describing the input
  // by an element that doesn't exist in the DOM.
  const hintId = hint && !error ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-err` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <Field $fullWidth={fullWidth}>
      {label && (
        <Label htmlFor={inputId} $hidden={hideLabel}>
          {label}
        </Label>
      )}
      <InputWrap $hasError={Boolean(error)}>
        {iconStart && <IconStart aria-hidden="true">{iconStart}</IconStart>}
        <Native
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          {...rest}
        />
      </InputWrap>
      {hint && !error && <Hint id={hintId}>{hint}</Hint>}
      {error && (
        <Err id={errorId} role="alert">
          {error}
        </Err>
      )}
    </Field>
  );
});

const Field = styled.div<{ $fullWidth: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.space[2]};
  width: ${({ $fullWidth }) => ($fullWidth ? '100%' : 'auto')};
`;

const Label = styled.label<{ $hidden?: boolean }>`
  font-size: ${({ theme }) => theme.fontSize.sm};
  font-weight: ${({ theme }) => theme.fontWeight.medium};
  color: ${({ theme }) => theme.color.text};
  ${({ $hidden }) =>
    $hidden &&
    `
      position: absolute;
      width: 1px; height: 1px;
      padding: 0; margin: -1px;
      overflow: hidden; clip: rect(0,0,0,0);
      white-space: nowrap; border: 0;
    `}
`;

const InputWrap = styled.div<{ $hasError: boolean }>`
  display: flex;
  align-items: center;
  background: ${({ theme }) => theme.color.surface};
  border: 1px solid
    ${({ theme, $hasError }) => ($hasError ? theme.color.danger : theme.color.border)};
  border-radius: ${({ theme }) => theme.radius.md};
  transition: border-color ${({ theme }) => theme.motion.fast},
    box-shadow ${({ theme }) => theme.motion.fast};

  &:focus-within {
    border-color: ${({ theme, $hasError }) =>
      $hasError ? theme.color.danger : theme.color.primary};
    box-shadow: 0 0 0 3px
      color-mix(in srgb, ${({ theme, $hasError }) =>
        $hasError ? theme.color.danger : theme.color.primary} 22%, transparent);
  }
`;

const IconStart = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding-left: ${({ theme }) => theme.space[3]};
  color: ${({ theme }) => theme.color.textMuted};
  pointer-events: none;
`;

const Native = styled.input`
  flex: 1;
  min-width: 0;
  padding: ${({ theme }) => `${theme.space[2]} ${theme.space[3]}`};
  height: 38px;
  font-family: inherit;
  font-size: ${({ theme }) => theme.fontSize.sm};
  color: ${({ theme }) => theme.color.text};
  background: transparent;
  border: none;
  outline: none;

  &::placeholder {
    color: ${({ theme }) => theme.color.textSubtle};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Hint = styled.div`
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.color.textMuted};
`;

const Err = styled.div`
  font-size: ${({ theme }) => theme.fontSize.xs};
  color: ${({ theme }) => theme.color.danger};
`;
