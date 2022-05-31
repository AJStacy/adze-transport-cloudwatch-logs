import {
  ResourceAlreadyExistsException,
  InvalidSequenceTokenException,
} from '@aws-sdk/client-cloudwatch-logs';

export function isError(e: unknown): e is Error {
  return e instanceof Error;
}

export function isInvalidSequenceTokenException(e: unknown): e is InvalidSequenceTokenException {
  return e instanceof InvalidSequenceTokenException;
}

export function isResourceAlreadyExistsException(e: unknown): e is ResourceAlreadyExistsException {
  return e instanceof ResourceAlreadyExistsException;
}
