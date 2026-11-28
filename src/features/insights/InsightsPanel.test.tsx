import userEvent from '@testing-library/user-event';
import { renderWithProviders, screen, waitFor } from '@/test/utils';
import { askInsight } from '@/services/insightsClient';
import { redirectTo, startCheckout } from '@/services/billingClient';
import { ProRequiredError, SignInRequiredError } from '@/services/errors';
import { InsightsPanel } from './InsightsPanel';
import { useInsightsStore } from './insightsStore';

jest.mock('@/services/insightsClient', () => ({
  askInsight: jest.fn(),
}));

jest.mock('@/services/billingClient', () => ({
  startCheckout: jest.fn(),
  redirectTo: jest.fn(),
}));

const mockedAsk = askInsight as jest.MockedFunction<typeof askInsight>;
const mockedCheckout = startCheckout as jest.MockedFunction<typeof startCheckout>;
const mockedRedirect = redirectTo as jest.MockedFunction<typeof redirectTo>;

beforeEach(() => {
  mockedAsk.mockReset();
  mockedCheckout.mockReset();
  mockedRedirect.mockReset();
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

  it('marks each verified figure and lists where it came from', async () => {
    mockedAsk.mockResolvedValue({
      answer: 'VTI is worth $34,946.20, which is 45.4% of the portfolio.',
      citations: [
        { kind: 'metric', ref: 'get_concentration' },
        { kind: 'figure', ref: 'get_concentration', text: '$34,946.20', path: '[VTI].marketValue', value: 34946.2 },
        { kind: 'figure', ref: 'get_concentration', text: '45.4%', path: '[VTI].weight', value: 0.4538 },
      ],
      model: 'claude-sonnet-5-5',
      guardrail: null,
    });
    renderWithProviders(<InsightsPanel />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Am I over-concentrated in any position?' }),
    );

    const sources = await screen.findByRole('list', { name: 'Sources for each figure' });
    expect(sources).toHaveTextContent('get_concentration → [VTI].marketValue = 34946.2');
    expect(sources).toHaveTextContent('get_concentration → [VTI].weight = 0.4538');
    expect(screen.getByRole('link', { name: 'source 2' })).toHaveAttribute('href', '#insight-src-2');
    expect(screen.getByTitle('get_concentration → [VTI].weight = 0.4538')).toHaveTextContent('45.4%');
  });

  it('labels answers shaped by a guardrail', async () => {
    mockedAsk.mockResolvedValue({
      answer: "I can't tell you what to buy, sell or hold.",
      citations: [],
      model: 'deterministic',
      guardrail: 'refused:advice',
    });
    renderWithProviders(<InsightsPanel />);

    await userEvent.type(screen.getByLabelText('Ask about your portfolio'), 'Should I sell AAPL?');
    await userEvent.click(screen.getByRole('button', { name: 'Ask' }));

    expect(await screen.findByText('Investment advice declined')).toBeInTheDocument();
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

  it('offers Pro checkout when the API says insights need Pro', async () => {
    mockedAsk.mockRejectedValue(new ProRequiredError());
    mockedCheckout.mockResolvedValue('https://checkout.stripe.com/c/pay/cs_test');
    renderWithProviders(<InsightsPanel />);

    await userEvent.click(
      screen.getByRole('button', { name: 'How is my portfolio doing overall?' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(/part of FinVision Pro/);

    const upgrade = screen.getByRole('button', { name: 'Upgrade to Pro' });
    await userEvent.click(upgrade);
    await waitFor(() =>
      expect(mockedRedirect).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_test'),
    );
    expect(useInsightsStore.getState().needsPro).toBe(true);

    // A second attempt in the same session reuses the idempotency key.
    mockedCheckout.mockRejectedValueOnce(new Error('network'));
    await userEvent.click(screen.getByRole('button', { name: /Upgrade to Pro|Opening/ }));
    const keys = mockedCheckout.mock.calls.map(([key]) => key);
    expect(new Set(keys).size).toBe(1);
  });

  it('shows a plain error, not an upgrade offer, for other failures', async () => {
    mockedAsk.mockRejectedValue(new Error('500'));
    renderWithProviders(<InsightsPanel />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Summarize my recent activity.' }),
    );
    await screen.findByRole('alert');
    expect(screen.queryByRole('button', { name: 'Upgrade to Pro' })).not.toBeInTheDocument();
  });

  it('asks a signed-out user to sign in instead of blaming the service', async () => {
    mockedAsk.mockRejectedValue(new SignInRequiredError());
    renderWithProviders(<InsightsPanel />);
    await userEvent.click(
      screen.getByRole('button', { name: 'What was my biggest mover today?' }),
    );
    expect(await screen.findByRole('alert')).toHaveTextContent('Sign in to use the assistant.');
    expect(screen.queryByRole('button', { name: 'Upgrade to Pro' })).not.toBeInTheDocument();
  });
});
