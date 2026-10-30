import { buildPaths, MiniTrend } from './MiniTrend';
import { renderWithProviders, screen } from '@/test/utils';

describe('buildPaths', () => {
  test('returns empty paths for fewer than two points', () => {
    expect(buildPaths([5])).toEqual({ line: '', area: '' });
  });

  test('maps first and last points to the left and right edges', () => {
    const { line, area } = buildPaths([1, 2, 3]);
    expect(line.startsWith('M0.00,')).toBe(true);
    expect(line).toContain('100.00,');
    expect(area.endsWith('L100,32 L0,32 Z')).toBe(true);
  });

  test('handles a flat series without dividing by zero', () => {
    expect(buildPaths([4, 4, 4]).line).not.toContain('NaN');
  });
});

describe('<MiniTrend />', () => {
  test('is exposed as an image when labelled', () => {
    renderWithProviders(<MiniTrend values={[1, 3, 2, 5]} label="Value, last 4 days" />);
    expect(screen.getByRole('img', { name: 'Value, last 4 days' })).toBeInTheDocument();
  });

  test('renders nothing for too little data', () => {
    const { container } = renderWithProviders(<MiniTrend values={[1]} />);
    expect(container.querySelector('svg')).toBeNull();
  });
});
