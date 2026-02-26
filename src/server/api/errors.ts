import { l } from '@/lib/clients/logger/logger'
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

interface HandleBackendApiErrorInput {
  status: number
  error: unknown
  teamId: string
  path: string
  logKey: string
  message: string
  context?: Record<string, unknown>
}

function handleBackendApiError({
  status,
  error,
  teamId,
  path,
  logKey,
  message,
  context,
}: HandleBackendApiErrorInput): never {
  l.error(
    {
      key: logKey,
      error,
      team_id: teamId,
      context: {
        status,
        path,
        ...(context ?? {}),
      },
    },
    `${message}: ${((error as { message?: string })?.message as string) || 'Unknown error'}`
  )

  if (status === 404) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: "Build not found or you don't have access to it",
    })
  }

  throw apiError(status)
}

export function handleDashboardApiError(
  input: Omit<HandleBackendApiErrorInput, 'message'>
): never {
  return handleBackendApiError({
    ...input,
    message: `failed to fetch ${input.path}`,
  })
}

export function handleInfraApiError(
  input: Omit<HandleBackendApiErrorInput, 'message'>
): never {
  return handleBackendApiError({
    ...input,
    message: `failed to fetch ${input.path}`,
  })
}
