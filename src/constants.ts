export const CACHE_PREFIX = 'adze-transport-cloudwatch-logs';

// The configuration defaults.
export const DEFAULTS = Object.freeze({
  batchSize: 1000000,
  transportHiddenLogs: false,
  rate: 5000,
});
