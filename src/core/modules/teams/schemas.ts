import { z } from 'zod'
import { TeamIdOrSlugSchema } from '@/core/shared/schemas/team'

export { TeamIdOrSlugSchema }

export const TeamNameSchema = z
  .string()
  .trim()
  .min(1, { message: 'Team name cannot be empty' })
  .max(32, { message: 'Team name cannot be longer than 32 characters' })
  .regex(/^[a-zA-Z0-9]+(?:[ _.-][a-zA-Z0-9]+)*$/, {
    message:
      'Names can only contain letters and numbers, separated by spaces, underscores, hyphens, or dots',
  })

export const UpdateTeamNameSchema = z.object({
  teamIdOrSlug: TeamIdOrSlugSchema,
  name: TeamNameSchema,
})

export const CreateTeamSchema = z.object({
  name: TeamNameSchema,
})
