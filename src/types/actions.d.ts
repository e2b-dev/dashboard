import { ClientTeam } from './dashboard.types'

/*
 * Server actions do not return thrown error messages in production, for security.
 *
 * Instead, we return a ts type inferred success or error object,
 * which can be used to filter information about errors in the frontend.
 */
interface ActionErrorResponse {
  type: 'error'
  message: string
  code?: string
}

interface ActionSuccessResponse<T> {
  type: 'success'
  data: T
}

type ActionResponse<T> = ActionErrorResponse | ActionSuccessResponse<T>

type ActionFunction<TInput, TOutput> = (input: TInput) => Promise<TOutput>

export type {
  ActionResponse,
  ActionFunction,
  ActionErrorResponse,
  ActionSuccessResponse,
}
