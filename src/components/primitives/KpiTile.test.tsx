import { KpiTile } from '@/components/primitives/KpiTile';
import { renderWithProviders, screen } from '@/test/utils';

describe('<KpiTile />', () => {
  test('renders label, value, and secondary text', () => {
    renderWithProviders(
      <KpiTile label="Total value" value="$10,000" secondary="vs. yesterday" />,
    );
    expect(screen.getByText('Total value')).toBeInTheDocument();
    expect(screen.getByText('$10,000')).toBeInTheDocument();
    expect(screen.getByText('vs. yesterday')).toBeInTheDocument();
  });

  test('renders an aria-labelled trend pill when changePct is provided', () => {
    renderWithProviders(
      <KpiTile label="Total value" value="$10,000" changePct={0.0234} />,
    );
    expect(screen.getByLabelText(/Change:/)).toBeInTheDocument();
  });

  test('does not render a trend pill when changePct is omitted', () => {
    renderWithProviders(<KpiTile label="Total value" value="$10,000" />);
    expect(screen.queryByLabelText(/Change:/)).not.toBeInTheDocument();
  });
});
