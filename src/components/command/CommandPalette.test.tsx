import { Route, Routes, useLocation } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { CommandPalette, scoreMatch, useCommandPaletteHotkey } from './CommandPalette';
import { renderWithProviders, screen } from '@/test/utils';
import { selectCurrency, selectLiveFeed } from '@/features/ui/uiSlice';

function Where() {
  return <div data-testid="path">{useLocation().pathname}</div>;
}

function Harness() {
  const [open, setOpen] = useCommandPaletteHotkey();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        open
      </button>
      <CommandPalette open={open} onClose={() => setOpen(false)} />
      <Routes>
        <Route path="*" element={<Where />} />
      </Routes>
    </>
  );
}

describe('scoreMatch', () => {
  test('matches subsequences and rejects non-matches', () => {
    expect(scoreMatch('hld', 'Holdings')).toBeGreaterThan(0);
    expect(scoreMatch('xyz', 'Holdings')).toBe(-1);
  });

  test('ranks prefix and consecutive matches above scattered ones', () => {
    expect(scoreMatch('wat', 'Watchlist')).toBeGreaterThan(scoreMatch('wat', 'Switch to dark mode'));
  });
});

describe('<CommandPalette />', () => {
  test('opens with Ctrl+K and closes with Escape, restoring focus', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />, { route: '/app' });
    const opener = screen.getByRole('button', { name: 'open' });
    opener.focus();

    await user.keyboard('{Control>}k{/Control}');
    const input = screen.getByRole('combobox');
    expect(input).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  test('filters commands and navigates with the keyboard', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />, { route: '/app' });
    await user.click(screen.getByRole('button', { name: 'open' }));

    await user.keyboard('hold');
    const options = screen.getAllByRole('option');
    expect(options[0]).toHaveTextContent('Holdings');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{Enter}');
    expect(screen.getByTestId('path')).toHaveTextContent('/holdings');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  test('runs preference commands against the store', async () => {
    const user = userEvent.setup();
    const { store } = renderWithProviders(<Harness />, { route: '/app' });
    const feedBefore = selectLiveFeed(store.getState());

    await user.click(screen.getByRole('button', { name: 'open' }));
    await user.keyboard('prices{Enter}');
    expect(selectLiveFeed(store.getState())).toBe(!feedBefore);

    await user.click(screen.getByRole('button', { name: 'open' }));
    await user.click(screen.getByRole('option', { name: /Show values in EUR/ }));
    expect(selectCurrency(store.getState())).toBe('EUR');
  });

  test('shows an empty state when nothing matches', async () => {
    const user = userEvent.setup();
    renderWithProviders(<Harness />);
    await user.click(screen.getByRole('button', { name: 'open' }));
    await user.keyboard('zzzz');
    expect(screen.getByText(/No commands match/)).toBeInTheDocument();
  });
});

test('group headers appear once each while filtering', async () => {
  const user = userEvent.setup();
  renderWithProviders(<Harness />);
  await user.click(screen.getByRole('button', { name: 'open' }));
  await user.keyboard('ho');
  expect(screen.getAllByText('Navigate')).toHaveLength(1);
  expect(screen.getAllByText('Preferences')).toHaveLength(1);
});
