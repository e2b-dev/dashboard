import { headers } from 'next/headers'
import { z } from 'zod'
import { auth } from '@/core/server/auth'
import { createTRPCRouter } from '@/core/server/trpc/init'
import { publicProcedure } from '@/core/server/trpc/procedures'
import { relativeUrlSchema } from '@/core/shared/schemas/url'

export const authRouter = createTRPCRouter({
  // Returns the URL the client should HARD-navigate to (via window.location)
  // rather than redirect()-ing server-side: a soft RSC navigation re-renders the
  // signed-out dashboard and tears down the "Logging out..." overlay before the
  // browser leaves the page. publicProcedure (no auth guard) keeps sign-out
  // resilient even if the session is already gone.
  signOut: publicProcedure
    .input(
      z
        .object({
          returnTo: relativeUrlSchema.optional(),
        })
        .optional()
    )
    .mutation(async ({ input }) => {
      const origin = (await headers()).get('origin') ?? undefined
      const { redirectTo } = await auth.signOut({
        origin,
        returnTo: input?.returnTo,
      })

      return { url: redirectTo }
    }),
})
