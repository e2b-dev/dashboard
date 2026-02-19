import { TRPCError } from '@trpc/server'

export const forbiddenTeamAccessError = () =>
  new TRPCError({
    code: 'FORBIDDEN',
    message: 'You are not authorized to access this team',
  })

export const unauthorizedUserError = () =>
  new TRPCError({
    code: 'UNAUTHORIZED',
    message: 'You are not authenticated',
  })

export const internalServerError = () =>
  new TRPCError({
    code: 'INTERNAL_SERVER_ERROR',
    message:
      'An Unexpected Error Occurred, please try again. If the problem persists, contact support.',
  })

export const apiError = (status: number) => {
  switch (status) {
    case 403:
      return forbiddenTeamAccessError()
    case 401:
      return unauthorizedUserError()
    default:
      return internalServerError()
  }
}
