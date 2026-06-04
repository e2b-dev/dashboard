import { TRPCError } from '@trpc/server'
import { ActionError } from '@/core/server/actions/utils'
import { createTRPCRouter } from '@/core/server/trpc/init'
import { protectedProcedure } from '@/core/server/trpc/procedures'
import { generateE2BUserAccessToken } from '@/lib/utils/server'

const accountRouter = createTRPCRouter({
  getUserAccessToken: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      return await generateE2BUserAccessToken(ctx.session.access_token)
    } catch (error) {
      if (error instanceof ActionError) {
        throw new TRPCError({
          code: error.expected ? 'BAD_REQUEST' : 'INTERNAL_SERVER_ERROR',
          message: error.message,
          cause: error.cause,
        })
      }

      throw error
    }
  }),
})

export { accountRouter }
