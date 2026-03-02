import type { TRPCAppRouter } from '@/server/api/routers'
import { TRPCClientError, type TRPCClientErrorLike } from '@trpc/client'

export function isNotFoundError(
  error: unknown
): error is
  | TRPCClientErrorLike<TRPCAppRouter>
  | TRPCClientError<TRPCAppRouter> {
  if (error instanceof TRPCClientError) {
    return error.data?.code === 'NOT_FOUND'
  }

  if (typeof error !== 'object' || error === null) {
    return false
  }

  const trpcLikeError = error as {
    data?: { code?: string }
    shape?: { data?: { code?: string } }
  }

  return (
    trpcLikeError.data?.code === 'NOT_FOUND' ||
    trpcLikeError.shape?.data?.code === 'NOT_FOUND'
  )
}
