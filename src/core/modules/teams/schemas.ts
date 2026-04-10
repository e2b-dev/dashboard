import { z } from 'zod'
import { TeamSlugSchema } from '@/core/shared/schemas/team'

const TeamNameSchema = z
  .string()
  .trim()
  .min(1, { message: 'Team name cannot be empty' })
  .max(32, { message: 'Team name cannot be longer than 32 characters' })
  .regex(/^[a-zA-Z0-9]+(?:[ _.-][a-zA-Z0-9]+)*$/, {
    message:
      'Names can only contain letters and numbers, separated by spaces, underscores, hyphens, or dots',
  })

const UpdateTeamNameSchema = z.object({
  teamSlug: TeamSlugSchema,
  name: TeamNameSchema,
})

const CreateTeamSchema = z.object({
  name: TeamNameSchema,
})

const AddTeamMemberSchema = z.object({
  email: z.email(),
})

const RemoveTeamMemberSchema = z.object({
  userId: z.uuid(),
})

export {
  AddTeamMemberSchema,
  CreateTeamSchema,
  RemoveTeamMemberSchema,
  TeamNameSchema,
  TeamSlugSchema,
  UpdateTeamNameSchema,
}
