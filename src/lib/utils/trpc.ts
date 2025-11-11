import { TRPCError } from '@trpc/server'

export function createInfraTRPCError(status: number) {
  switch (status) {
    case 403:
      return new TRPCError({
        code: 'FORBIDDEN',
        message:
          'You may have reached your billing limits or your account may be blocked. Please check your billing settings or contact support.',
      })
    case 401:
      return new TRPCError({
        code: 'UNAUTHORIZED',
        message: 'Unauthorized',
      })
    default:
      return new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred',
      })
  }
}
