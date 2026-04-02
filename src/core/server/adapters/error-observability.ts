import type { TRPCError } from '@trpc/server'
import type { RepoError } from '@/core/shared/result'

export function getObservedError(error: unknown): unknown {
  if (
    typeof error === 'object' &&
    error !== null &&
    'cause' in error &&
    error.cause !== undefined &&
    error.cause !== null
  ) {
    return error.cause
  }

  return error
}

export function getObservedErrorMessage(error: unknown): string {
  const observedError = getObservedError(error)

  if (typeof observedError === 'string') {
    return observedError
  }

  if (
    typeof observedError === 'object' &&
    observedError !== null &&
    'message' in observedError &&
    typeof observedError.message === 'string'
  ) {
    return observedError.message
  }

  return 'Unknown error'
}

export function getObservedException(error: unknown): Error {
  const observedError = getObservedError(error)

  if (observedError instanceof Error) {
    return observedError
  }

  return new Error(getObservedErrorMessage(observedError))
}

export function isExpectedRepoError(error: RepoError): boolean {
  switch (error.code) {
    case 'unauthorized':
    case 'forbidden':
    case 'not_found':
    case 'validation':
    case 'conflict':
      return true
    default:
      return false
  }
}

export function isExpectedTRPCError(error: TRPCError): boolean {
  switch (error.code) {
    case 'UNAUTHORIZED':
    case 'FORBIDDEN':
    case 'NOT_FOUND':
    case 'BAD_REQUEST':
    case 'CONFLICT':
      return true
    default:
      return false
  }
}

export function isExpectedStatus(status: number): boolean {
  return status < 500
}
