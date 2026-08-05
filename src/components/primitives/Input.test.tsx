import { Input } from '@/components/primitives/Input';
import { renderWithProviders, screen } from '@/test/utils';

describe('<Input />', () => {
  test('associates label and input', () => {
    renderWithProviders(<Input label="Symbol" />);
    const input = screen.getByLabelText('Symbol');
    expect(input).toBeInTheDocument();
    expect(input.tagName).toBe('INPUT');
  });

  test('renders the hint and links it via aria-describedby', () => {
    renderWithProviders(<Input label="Symbol" hint="Use the ticker symbol" />);
    const input = screen.getByLabelText('Symbol');
    const describedBy = input.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    expect(screen.getByText('Use the ticker symbol').id).toBe(describedBy);
  });

  test('error replaces hint and is announced as an alert', () => {
    renderWithProviders(
      <Input label="Symbol" hint="Use the ticker" error="Required field" />,
    );
    expect(screen.queryByText('Use the ticker')).not.toBeInTheDocument();
    const error = screen.getByRole('alert');
    expect(error).toHaveTextContent('Required field');
    const input = screen.getByLabelText('Symbol');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.getAttribute('aria-describedby')).toBe(error.id);
  });

  test('hideLabel keeps the label accessible while visually hiding it', () => {
    renderWithProviders(<Input label="Search" hideLabel />);
    expect(screen.getByLabelText('Search')).toBeInTheDocument();
  });
});
