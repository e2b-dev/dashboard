import { z } from 'zod'
import { createTRPCRouter } from '../init'
import { protectedTeamProcedure } from '../procedures'
import { supportRepo } from '../repositories/support.repository'

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
      const { teamId, user } = ctx
      const email = user.email

      if (!email) {
        throw new Error('Email not found')
      }

      const team = await supportRepo.getTeamSupportData(teamId)

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
