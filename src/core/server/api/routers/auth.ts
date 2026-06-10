import { ConfirmEmailInputSchema } from '@/core/modules/auth/models'
import { verifyOtpAndBuildRedirect } from '@/core/server/auth/verify-otp'
import { createTRPCRouter } from '@/core/server/trpc/init'
import { publicProcedure } from '@/core/server/trpc/procedures'

export const authRouter = createTRPCRouter({
  verifyOtp: publicProcedure
    .input(ConfirmEmailInputSchema)
    .mutation(({ ctx, input }) =>
      verifyOtpAndBuildRedirect(input, ctx.requestOrigin)
    ),
})
