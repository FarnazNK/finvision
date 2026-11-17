/** The API answered 402: this feature needs FinVision Pro. */
export class ProRequiredError extends Error {
  constructor(message = 'FinVision Pro is required for AI insights.') {
    super(message);
    this.name = 'ProRequiredError';
  }
}
