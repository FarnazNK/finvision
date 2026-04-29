import { useState } from 'react';
import userEvent from '@testing-library/user-event';
import { SegmentedControl } from '@/components/primitives/SegmentedControl';
import { renderWithProviders, screen } from '@/test/utils';

const options = [
  { value: '1W', label: '1W' },
  { value: '1M', label: '1M' },
  { value: '3M', label: '3M' },
] as const;

function Wrapper() {
  const [v, setV] = useState<'1W' | '1M' | '3M'>('1W');
  return (
    <SegmentedControl
      label="Time range"
      value={v}
      onChange={(next) => setV(next as '1W' | '1M' | '3M')}
      options={options}
    />
  );
}

describe('<SegmentedControl />', () => {
  test('exposes a radiogroup with the provided label', () => {
    renderWithProviders(<Wrapper />);
    expect(screen.getByRole('radiogroup', { name: 'Time range' })).toBeInTheDocument();
  });

  test('marks the selected option with aria-checked', () => {
    renderWithProviders(<Wrapper />);
    const radios = screen.getAllByRole('radio');
    expect(radios[0]).toHaveAttribute('aria-checked', 'true');
    expect(radios[1]).toHaveAttribute('aria-checked', 'false');
  });

  test('clicking a segment selects it', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Wrapper />);
    await user.click(screen.getByRole('radio', { name: '3M' }));
    expect(screen.getByRole('radio', { name: '3M' })).toHaveAttribute('aria-checked', 'true');
  });

  test('arrow keys move selection within the group', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Wrapper />);
    const radios = screen.getAllByRole('radio');
    radios[0].focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getAllByRole('radio')[1]).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{ArrowRight}');
    expect(screen.getAllByRole('radio')[2]).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{ArrowRight}'); // wraps
    expect(screen.getAllByRole('radio')[0]).toHaveAttribute('aria-checked', 'true');
    await user.keyboard('{ArrowLeft}'); // wraps backwards
    expect(screen.getAllByRole('radio')[2]).toHaveAttribute('aria-checked', 'true');
  });
});
