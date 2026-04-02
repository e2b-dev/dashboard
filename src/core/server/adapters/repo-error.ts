import { SpanStatusCode, trace } from '@opentelemetry/api'
import { TRPCError } from '@trpc/server'
import { ActionError } from '@/core/server/actions/utils'
import {
  getObservedException,
  getObservedErrorMessage,
  isExpectedRepoError,
} from '@/core/server/adapters/error-observability'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import { getPublicRepoErrorMessage } from '@/core/shared/errors'
import type { RepoError } from '@/core/shared/result'

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
