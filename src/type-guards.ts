import {
  DataAlreadyAcceptedException,
  ResourceAlreadyExistsException,
  InvalidSequenceTokenException,
  CloudWatchLogsServiceException,
} from '@aws-sdk/client-cloudwatch-logs';

export function isDataAlreadyAcceptedException(e: unknown): e is DataAlreadyAcceptedException {
  return e instanceof DataAlreadyAcceptedException;
}

export function isInvalidSequenceTokenException(e: unknown): e is InvalidSequenceTokenException {
  return e instanceof InvalidSequenceTokenException;
}

export function isResourceAlreadyExistsException(e: unknown): e is ResourceAlreadyExistsException {
  return e instanceof ResourceAlreadyExistsException;
}

export function isCloudWatchLogsServiceException(e: unknown): e is CloudWatchLogsServiceException {
  return e instanceof CloudWatchLogsServiceException;
}
