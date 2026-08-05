import userEvent from '@testing-library/user-event';
import { Button } from '@/components/primitives/Button';
import { renderWithProviders, screen } from '@/test/utils';

describe('<Button />', () => {
  test('renders its children', () => {
    renderWithProviders(<Button>Save changes</Button>);
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  test('invokes onClick when activated', async () => {
    const onClick = jest.fn();
    const user = userEvent.setup();
    renderWithProviders(<Button onClick={onClick}>Go</Button>);
    await user.click(screen.getByRole('button', { name: 'Go' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('does not invoke onClick when disabled', async () => {
    const onClick = jest.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <Button onClick={onClick} disabled>
        Go
      </Button>,
    );
    await user.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });

  test('exposes aria-busy and disables interaction while loading', async () => {
    const onClick = jest.fn();
    const user = userEvent.setup();
    renderWithProviders(
      <Button isLoading onClick={onClick}>
        Saving
      </Button>,
    );
    const btn = screen.getByRole('button');
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(btn).toBeDisabled();
    await user.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  test('renders icons before and after the label', () => {
    renderWithProviders(
      <Button iconStart={<span data-testid="start">›</span>} iconEnd={<span data-testid="end">‹</span>}>
        Label
      </Button>,
    );
    expect(screen.getByTestId('start')).toBeInTheDocument();
    expect(screen.getByTestId('end')).toBeInTheDocument();
  });
});
