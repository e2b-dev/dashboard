import type { RepoError, RepoErrorCode } from './result'

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
  new E2BError('UNAUTHENTICATED', 'User not authenticated')

export const UnauthorizedError = (message: string) =>
  new E2BError('UNAUTHORIZED', message)

export const InvalidApiKeyError = (message: string) =>
  new E2BError('INVALID_API_KEY', message)

export const InvalidParametersError = (message: string) =>
  new E2BError('INVALID_PARAMETERS', message)

export const ApiError = (message: string) => new E2BError('API_ERROR', message)

export const UnknownError = (message?: string) =>
  new E2BError(
    'UNKNOWN',
    message ??
      'An Unexpected Error Occurred, please try again. If the problem persists, please contact support.'
  )

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

const SAFE_AUTH_MESSAGE = 'Unauthorized'
const SAFE_FORBIDDEN_MESSAGE = 'You are not authorized to access this resource'
const SAFE_INTERNAL_MESSAGE =
  'An Unexpected Error Occurred, please try again. If the problem persists, please contact support.'

export function getPublicErrorMessage(input: {
  code?: RepoErrorCode | string
  status?: number
}): string {
  const { code, status } = input

  if (code === 'unauthorized' || status === 401) return SAFE_AUTH_MESSAGE
  if (code === 'forbidden' || status === 403) return SAFE_FORBIDDEN_MESSAGE
  if (
    code === 'internal' ||
    code === 'unavailable' ||
    (status !== undefined && status >= 500)
  )
    return SAFE_INTERNAL_MESSAGE

  return SAFE_INTERNAL_MESSAGE
}

export function getPublicRepoErrorMessage(error: RepoError): string {
  switch (error.code) {
    case 'not_found':
    case 'validation':
    case 'conflict':
      return error.message
    default:
      return getPublicErrorMessage({ code: error.code, status: error.status })
  }
}

export function repoErrorFromHttp(
  status: number,
  message: string,
  cause?: unknown
): RepoError {
  switch (status) {
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
