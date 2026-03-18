export type RepoResult<T, E = RepoError> =
  | {
      ok: true
      data: T
      error?: undefined
    }
  | {
      ok: false
      data?: undefined
      error: E
    }

export type RepoErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'validation'
  | 'conflict'
  | 'internal'
  | 'unavailable'

export type RepoError = {
  code: RepoErrorCode
  status: number
  message: string
  cause?: unknown
}

export const ok = <T>(data: T): RepoResult<T> => ({
  ok: true,
  data,
})

export const err = <E = RepoError>(error: E): RepoResult<never, E> => ({
  ok: false,
  error,
})
