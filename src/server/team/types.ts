import { Database } from '@/types/database.types'
import { z } from 'zod'

export type TeamMemberInfo = {
  id: string
  email: string
  name: string
  avatar_url: string
}

export type TeamMember = {
  info: TeamMemberInfo
  relation: Database['public']['Tables']['users_teams']['Row']
}

/**
 * Valid: "Team 1", "DevOps2023", "Engineering Team", "Dev-Ops", "Team_Name", "Team.Name"
 * Invalid: empty strings, "Team@Work", "Team--Name", names > 32 chars
 */
export const TeamNameSchema = z
  .string()
  .trim()
  .min(1, { message: 'Team name cannot be empty' })
  .max(32, { message: 'Team name cannot be longer than 32 characters' })
  .regex(/^[a-zA-Z0-9]+(?:[ _.\-][a-zA-Z0-9]+)*$/, {
    message:
      'Names can only contain letters and numbers, separated by spaces, underscores, hyphens, or dots',
  })

// Shared schemas

const UpdateTeamNameSchema = z.object({
  teamId: z.string().uuid(),
  name: TeamNameSchema,
})

const CreateTeamSchema = z.object({
  name: TeamNameSchema,
})

export { CreateTeamSchema, UpdateTeamNameSchema }
