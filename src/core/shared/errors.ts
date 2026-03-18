import type { RepoError, RepoErrorCode } from './result'

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
