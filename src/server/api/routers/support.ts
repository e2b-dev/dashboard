import { TRPCError } from '@trpc/server'
import { z } from 'zod'
import { createTRPCRouter } from '../init'
import { protectedTeamProcedure } from '../procedures'
import { supportRepo } from '../repositories/support.repository'

const E2B_API_KEY_REGEX = /e2b_[a-f0-9]{40}/i

const fileSchema = z.object({
  name: z.string(),
  type: z.string(),
  base64: z.string(),
})

export const supportRouter = createTRPCRouter({
  contactSupport: protectedTeamProcedure
    .input(
      z.object({
        description: z.string().min(1),
        files: z.array(fileSchema).max(5).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { teamId, session, user } = ctx
      const email = user.email

      if (!email) {
        throw new Error('Email not found')
      }

      if (E2B_API_KEY_REGEX.test(input.description)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message:
            'Your message contains an API key. Please remove it before sending.',
        })
      }

      const team = await supportRepo.getTeamSupportData(
        teamId,
        session.access_token
      )

      return supportRepo.createSupportThread({
        description: input.description,
        files: input.files,
        teamId,
        teamName: team.name,
        customerEmail: email,
        accountOwnerEmail: team.email,
        customerTier: team.tier,
      })
    }),
})
