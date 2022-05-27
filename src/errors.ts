export class SequenceTokenError extends Error {
  constructor(...params: any[]) {
    super(...params);

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, SequenceTokenError);
    }

    this.name = 'SequenceTokenError';
  }
}
