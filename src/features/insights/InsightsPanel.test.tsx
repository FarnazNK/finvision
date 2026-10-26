import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import { askInsight } from '@/services/insightsClient';
import { InsightsPanel } from './InsightsPanel';
import { useInsightsStore } from './insightsStore';

jest.mock('@/services/insightsClient', () => ({
  askInsight: jest.fn(),
}));

const mockedAsk = askInsight as jest.MockedFunction<typeof askInsight>;

beforeEach(() => {
  mockedAsk.mockReset();
  useInsightsStore.getState().reset();
});

describe('InsightsPanel', () => {
  it('shows a cited answer and records the question in history', async () => {
    mockedAsk.mockResolvedValue({
      answer: 'Tech is 48% of the portfolio.',
      citations: [{ kind: 'metric', ref: 'get_concentration' }],
      model: 'offline-fallback',
    });
    renderWithProviders(<InsightsPanel />);

    await userEvent.type(screen.getByLabelText('Ask about your portfolio'), 'Too much tech?');
    await userEvent.click(screen.getByRole('button', { name: 'Ask' }));

    expect(await screen.findByText('Tech is 48% of the portfolio.')).toBeInTheDocument();
    expect(screen.getByText(/grounded in get_concentration/)).toBeInTheDocument();
    expect(useInsightsStore.getState().history).toEqual(['Too much tech?']);
    expect(screen.getByRole('button', { name: 'Too much tech?' })).toBeInTheDocument();
  });

  it('shows a friendly error when the service fails', async () => {
    mockedAsk.mockRejectedValue(new Error('500'));
    renderWithProviders(<InsightsPanel />);

    await userEvent.click(
      screen.getByRole('button', { name: 'How is my portfolio doing overall?' }),
    );

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/temporarily unavailable/),
    );
    expect(useInsightsStore.getState().status).toBe('error');
  });
});
