import { UnauthorizedError, UnknownError } from '@/types/errors'

/**
 * Custom error class for action-specific errors.
 *
 * @remarks
 * This error class is used in server actions but will be serialized and sent to the client.
 * Be careful not to include sensitive information in error messages as they will be exposed to the client.
 * When thrown in a server action, the message will be visible in client-side error handling.
 */
export class ActionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ActionError'
  }
}

/**
 * Returns a server error to the client by throwing an ActionError.
 *
 * @param message - The error message to be sent to the client
 * @returns Never returns as it always throws an error
 *
 * @example
 * ```ts
 * if (error) {
 *   if (error.code === 'invalid_credentials') {
 *     return returnServerError('Invalid credentials')
 *   }
 *   throw error
 * }
 * ```
 *
 * @remarks
 * This function is used to return user-friendly error messages from server actions.
 * The error message will be serialized and sent to the client, so avoid including
 * sensitive information.
 */
export const returnServerError = (message: string) => {
  throw new ActionError(message)
}

export function handleDefaultInfraError(status: number) {
  switch (status) {
    case 403:
      return returnServerError(
        'You may have reached your billing limits or your account may be blocked. Please check your billing settings or contact support.'
      )
    case 401:
      return returnServerError(UnauthorizedError('Unauthorized').message)
    default:
      return returnServerError(UnknownError().message)
  }
}

export const flattenClientInputValue = (
  clientInput: unknown,
  key: string
): string | undefined => {
  if (typeof clientInput === 'object' && clientInput && key in clientInput) {
    return clientInput[key as keyof typeof clientInput]
  }

  return undefined
}
