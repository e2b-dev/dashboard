import { getPublicErrorMessage } from '@/core/shared/errors'

type ActionErrorOptions = {
  cause?: unknown
  expected?: boolean
}

export class ActionError extends Error {
  public expected: boolean
  public override cause?: unknown

  constructor(message: string, options: ActionErrorOptions = {}) {
    super(message)
    this.name = 'ActionError'
    this.expected = options.expected ?? true
    this.cause = options.cause
  }
}

export const returnServerError = (
  message: string,
  options?: ActionErrorOptions
) => {
  throw new ActionError(message, options)
}

export function handleDefaultInfraError(
  status: number,
  cause?: unknown
): never {
  return returnServerError(getPublicErrorMessage({ status }), {
    cause,
    expected: status < 500,
  })
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
