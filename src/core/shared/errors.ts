import { getBlockedReasonText } from '@/features/dashboard/team-blocked/team-blocked-message'
import type { RepoError, RepoErrorCode } from './result'

/**
 * Wire-format prefix used by infra-api for 403 responses caused by a
 * blocked team. The dashboard pattern-matches this prefix to translate
 * the response into a friendly, user-facing message.
 *
 */
export const TEAM_BLOCKED_MESSAGE_PREFIX = 'team is blocked'

export const PUBLIC_ERROR_MESSAGE_UNAUTHORIZED = 'Unauthorized'
export const PUBLIC_ERROR_MESSAGE_FORBIDDEN =
  'You are not authorized to access this resource'
export const PUBLIC_ERROR_MESSAGE_FORBIDDEN_TEAM =
  'You are not authorized to access this project'
export const PUBLIC_ERROR_MESSAGE_UNAUTHENTICATED = 'User not authenticated'
export const PUBLIC_ERROR_MESSAGE_INTERNAL =
  'An Unexpected Error Occurred, please try again. If the problem persists, please contact support.'

export type E2BErrorCode =
  | 'UNAUTHENTICATED'
  | 'UNAUTHORIZED'
  | 'INVALID_PARAMETERS'
  | 'INTERNAL_SERVER_ERROR'
  | 'API_ERROR'
  | 'UNKNOWN'
  | string

export class E2BError extends Error {
  public code: E2BErrorCode

  constructor(code: E2BErrorCode, message: string) {
    super(message)
    this.name = 'E2BError'
    this.code = code
  }
}

export const UnauthenticatedError = () =>
  new E2BError('UNAUTHENTICATED', PUBLIC_ERROR_MESSAGE_UNAUTHENTICATED)

export const UnauthorizedError = (message: string) =>
  new E2BError('UNAUTHORIZED', message)

export const InvalidApiKeyError = (message: string) =>
  new E2BError('INVALID_API_KEY', message)

export const InvalidParametersError = (message: string) =>
  new E2BError('INVALID_PARAMETERS', message)

export const ApiError = (message: string) => new E2BError('API_ERROR', message)

export const UnknownError = (message?: string) =>
  new E2BError('UNKNOWN', message ?? PUBLIC_ERROR_MESSAGE_INTERNAL)

export function isTeamBlockedError(input: {
  status?: number
  message?: string | null
}): boolean {
  if (input.status !== 403 || !input.message) return false
  return input.message.toLowerCase().startsWith(TEAM_BLOCKED_MESSAGE_PREFIX)
}

export function extractBlockedReason(
  message: string | null | undefined
): string | null {
  if (!message) return null
  const lower = message.toLowerCase()
  if (!lower.startsWith(TEAM_BLOCKED_MESSAGE_PREFIX)) return null
  const rest = message
    .slice(TEAM_BLOCKED_MESSAGE_PREFIX.length)
    .replace(/^[:\s]+/, '')
    .trim()
  return rest || null
}

export function createRepoError(input: {
  code: RepoErrorCode
  status: number
  message: string
  cause?: unknown
}): RepoError {
  return {
    code: input.code,
    status: input.status,
    message: input.message,
    cause: input.cause,
  }
}

export function getPublicErrorMessage(input: {
  code?: RepoErrorCode | string
  status?: number
  message?: string
}): string {
  const { code, status, message } = input

  if (isTeamBlockedError({ status, message })) {
    return getBlockedReasonText(extractBlockedReason(message))
  }

  if (code === 'unauthorized' || status === 401)
    return PUBLIC_ERROR_MESSAGE_UNAUTHORIZED
  if (code === 'forbidden' || status === 403)
    return PUBLIC_ERROR_MESSAGE_FORBIDDEN
  if (
    code === 'internal' ||
    code === 'unavailable' ||
    (status !== undefined && status >= 500)
  )
    return PUBLIC_ERROR_MESSAGE_INTERNAL

  return PUBLIC_ERROR_MESSAGE_INTERNAL
}

export function getPublicRepoErrorMessage(error: RepoError): string {
  switch (error.code) {
    case 'not_found':
    case 'validation':
    case 'conflict':
      return error.message
    default:
      return getPublicErrorMessage({
        code: error.code,
        status: error.status,
        message: error.message,
      })
  }
}

export function repoErrorFromHttp(
  status: number,
  message: string,
  cause?: unknown
): RepoError {
  switch (status) {
    case 400:
      return createRepoError({
        code: 'validation',
        status,
        message,
        cause,
      })
    case 401:
      return createRepoError({
        code: 'unauthorized',
        status,
        message,
        cause,
      })
    case 403:
      return createRepoError({
        code: 'forbidden',
        status,
        message,
        cause,
      })
    case 404:
      return createRepoError({
        code: 'not_found',
        status,
        message,
        cause,
      })
    case 409:
      return createRepoError({
        code: 'conflict',
        status,
        message,
        cause,
      })
    default:
      return createRepoError({
        code: status >= 500 ? 'unavailable' : 'internal',
        status,
        message,
        cause,
      })
  }
}
