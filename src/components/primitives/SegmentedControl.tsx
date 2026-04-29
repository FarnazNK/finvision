import { useId, type KeyboardEvent, type ReactNode } from 'react';
import styled from 'styled-components';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Optional accessible label override (e.g., "1 day" for "1D"). */
  ariaLabel?: string;
}

interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: ReadonlyArray<SegmentedOption<T>>;
  /** Group label announced by screen readers. */
  label: string;
  size?: 'sm' | 'md';
}

/**
 * Accessible segmented control implemented with role="radiogroup".
 * Arrow keys move between segments; selection follows focus, like ARIA APG.
 */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  size = 'md',
}: SegmentedControlProps<T>) {
  const groupId = useId();

  const handleKeyDown = (e: KeyboardEvent<HTMLButtonElement>, idx: number) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    const dir = e.key === 'ArrowRight' ? 1 : -1;
    const next = (idx + dir + options.length) % options.length;
    onChange(options[next].value);
    const root = (e.currentTarget as HTMLElement).parentElement;
    const buttons = root?.querySelectorAll<HTMLButtonElement>('[role="radio"]');
    buttons?.[next]?.focus();
  };

  return (
    <Group role="radiogroup" aria-label={label} $size={size} id={groupId}>
      {options.map((opt, idx) => {
        const selected = opt.value === value;
        return (
          <Segment
            key={opt.value}
            role="radio"
            aria-checked={selected}
            aria-label={opt.ariaLabel}
            tabIndex={selected ? 0 : -1}
            $selected={selected}
            $size={size}
            onClick={() => onChange(opt.value)}
            onKeyDown={(e: KeyboardEvent<HTMLButtonElement>) => handleKeyDown(e, idx)}
          >
            {opt.label}
          </Segment>
        );
      })}
    </Group>
  );
}

const Group = styled.div<{ $size: 'sm' | 'md' }>`
  display: inline-flex;
  background: ${({ theme }) => theme.color.surfaceAlt};
  border: 1px solid ${({ theme }) => theme.color.border};
  border-radius: ${({ theme }) => theme.radius.md};
  padding: 2px;
  gap: 2px;
`;

const Segment = styled.button<{ $selected: boolean; $size: 'sm' | 'md' }>`
  appearance: none;
  border: none;
  background: ${({ $selected, theme }) => ($selected ? theme.color.surface : 'transparent')};
  color: ${({ $selected, theme }) => ($selected ? theme.color.text : theme.color.textMuted)};
  padding: ${({ $size, theme }) =>
    $size === 'sm' ? `4px ${theme.space[3]}` : `6px ${theme.space[4]}`};
  font-size: ${({ theme, $size }) =>
    $size === 'sm' ? theme.fontSize.xs : theme.fontSize.sm};
  font-weight: ${({ theme, $selected }) =>
    $selected ? theme.fontWeight.semibold : theme.fontWeight.medium};
  border-radius: ${({ theme }) => theme.radius.sm};
  cursor: pointer;
  transition:
    background ${({ theme }) => theme.motion.fast},
    color ${({ theme }) => theme.motion.fast};
  box-shadow: ${({ $selected, theme }) => ($selected ? theme.shadow.xs : 'none')};

  &:hover:not([aria-checked='true']) {
    color: ${({ theme }) => theme.color.text};
  }
`;
