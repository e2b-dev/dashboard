import { TRPCClientError, type TRPCClientErrorLike } from '@trpc/client'
import { z } from 'zod'
import type { TRPCAppRouter } from '@/core/server/api/routers'

const TrpcErrorWithZodDataSchema = z.object({
  data: z
    .object({
      zodError: z
        .object({
          formErrors: z.array(z.string()),
          fieldErrors: z.record(z.string(), z.array(z.string()).optional()),
        })
        .nullable()
        .optional(),
    })
    .optional(),
})

const isNotFoundError = (
  error: unknown
): error is
  | TRPCClientErrorLike<TRPCAppRouter>
  | TRPCClientError<TRPCAppRouter> => {
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

const getTRPCValidationMessages = (error: unknown): string[] => {
  const parsedError = TrpcErrorWithZodDataSchema.safeParse(error)
  if (!parsedError.success || !parsedError.data.data?.zodError) return []

  const { formErrors, fieldErrors } = parsedError.data.data.zodError

  return [...formErrors, ...Object.values(fieldErrors).flatMap((messages) => messages ?? [])]
}

export { getTRPCValidationMessages, isNotFoundError }
