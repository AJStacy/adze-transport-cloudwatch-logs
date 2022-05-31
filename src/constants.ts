import { Configuration, StreamOptions } from './_contracts';

export const CACHE_PREFIX = 'adze-transport-cloudwatch-logs';

// The configuration defaults.
export const DEFAULTS: Configuration = Object.freeze({
  batchSize: 10000,
  transportHiddenLogs: false,
  rate: 5000,
  retries: 3,
  createLogGroup: false,
  createLogStream: false,
});

// Stream configuration defaults.
export const STREAM_OPTIONS_DEFAULTS: StreamOptions = Object.freeze({
  failureCb: () => {},
  successCb: () => {},
  groupTags: undefined,
});
