import { UnauthorizedError, UnknownError } from '@/core/shared/errors'

export class ActionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ActionError'
  }
}

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
