import { TRPCError } from '@trpc/server'
import type { RepoError } from '@/core/shared/result'
import { ActionError } from '@/lib/utils/action'

function trpcCodeFromRepoError(code: RepoError['code']): TRPCError['code'] {
  switch (code) {
    case 'unauthorized':
      return 'UNAUTHORIZED'
    case 'forbidden':
      return 'FORBIDDEN'
    case 'not_found':
      return 'NOT_FOUND'
    case 'validation':
      return 'BAD_REQUEST'
    case 'conflict':
      return 'CONFLICT'
    default:
      return 'INTERNAL_SERVER_ERROR'
  }
}

export function throwTRPCErrorFromRepoError(error: RepoError): never {
  throw new TRPCError({
    code: trpcCodeFromRepoError(error.code),
    message: error.message,
  })
}

export function toActionErrorFromRepoError(error: RepoError): never {
  throw new ActionError(error.message)
}

export function toRouteErrorResponse(error: RepoError): Response {
  return Response.json({ error: error.message }, { status: error.status })
}
