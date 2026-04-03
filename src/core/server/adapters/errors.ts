import { SpanStatusCode, trace } from '@opentelemetry/api'
import { TRPCError } from '@trpc/server'
import { ActionError } from '@/core/server/actions/utils'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import {
  getPublicRepoErrorMessage,
  PUBLIC_ERROR_MESSAGE_FORBIDDEN_TEAM,
  PUBLIC_ERROR_MESSAGE_INTERNAL,
  PUBLIC_ERROR_MESSAGE_UNAUTHENTICATED,
} from '@/core/shared/errors'
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

export const forbiddenTeamAccessError = () =>
  new TRPCError({
    code: 'FORBIDDEN',
    message: PUBLIC_ERROR_MESSAGE_FORBIDDEN_TEAM,
  })

export const unauthorizedUserError = () =>
  new TRPCError({
    code: 'UNAUTHORIZED',
    message: PUBLIC_ERROR_MESSAGE_UNAUTHENTICATED,
  })

export const internalServerError = () =>
  new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message: PUBLIC_ERROR_MESSAGE_INTERNAL,
  })

function trpcCodeFromRepoError(code: RepoError['code']): TRPCError['code'] {
  switch (code) {
    case 'unauthorized':
      return 'UNAUTHORIZED'
    case 'forbidden':
      return 'FORBIDDEN'
    case 'not_found':
      return 'NOT_FOUND'
    case 'validation':
      return 'BAD_REQUEST'
    case 'conflict':
      return 'CONFLICT'
    default:
      return 'INTERNAL_SERVER_ERROR'
  }
}

function logObfuscatedRepoError(
  transport: 'trpc' | 'action' | 'route',
  error: RepoError
) {
  const publicMessage = getPublicRepoErrorMessage(error)
  if (publicMessage === error.message) {
    return
  }

  const observedMessage = getObservedErrorMessage(error)
  const span = trace.getActiveSpan()

  span?.setStatus({
    code: SpanStatusCode.ERROR,
    message: observedMessage,
  })
  span?.recordException(getObservedException(error))

  const payload = {
    key: `transport:${transport}:repo_error`,
    repo_error_code: error.code,
    repo_error_status: error.status,
    public_message: publicMessage,
    error: serializeErrorForLog(error),
  }

  if (isExpectedRepoError(error)) {
    l.warn(payload, `[${transport}] ${error.code}: ${observedMessage}`)
    return
  }

  l.error(payload, `[${transport}] ${error.code}: ${observedMessage}`)
}

export function throwTRPCErrorFromRepoError(error: RepoError): never {
  logObfuscatedRepoError('trpc', error)

  throw new TRPCError({
    code: trpcCodeFromRepoError(error.code),
    message: getPublicRepoErrorMessage(error),
    cause: error,
  })
}

export function toActionErrorFromRepoError(error: RepoError): never {
  logObfuscatedRepoError('action', error)

  throw new ActionError(getPublicRepoErrorMessage(error), {
    cause: error,
    expected: isExpectedRepoError(error),
  })
}

export function toRouteErrorResponse(error: RepoError): Response {
  logObfuscatedRepoError('route', error)

  return Response.json(
    { error: getPublicRepoErrorMessage(error) },
    { status: error.status }
  )
}
