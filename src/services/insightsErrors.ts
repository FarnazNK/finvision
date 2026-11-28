/** A non-2xx response from the AI service, keeping the HTTP status. */
export class InsightsRequestError extends Error {
  constructor(public readonly status: number) {
    super(`Insights request failed: ${status}`);
    this.name = 'InsightsRequestError';
  }
}
