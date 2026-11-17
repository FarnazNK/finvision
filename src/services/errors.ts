/** The API answered 402: this feature needs FinVision Pro. */
export class ProRequiredError extends Error {
  constructor(message = 'FinVision Pro is required for AI insights.') {
    super(message);
    this.name = 'ProRequiredError';
  }
}

/** The API answered 401: the user has to sign in first. */
export class SignInRequiredError extends Error {
  constructor(message = 'Sign in to use AI insights.') {
    super(message);
    this.name = 'SignInRequiredError';
  }
}
