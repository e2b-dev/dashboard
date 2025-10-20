import { TeamIdOrSlugSchema } from '@/lib/schemas/team'
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
  teamIdOrSlug: TeamIdOrSlugSchema,
  name: TeamNameSchema,
})

const CreateTeamSchema = z.object({
  name: TeamNameSchema,
})

export { CreateTeamSchema, UpdateTeamNameSchema }

/**
 * Describes where the team information was resolved from.
 * Used for logging and debugging team resolution flow.
 */
export type TeamResolutionSource =
  | 'url-cookies' // Resolved from URL segment matching valid cookie metadata
  | 'cookies' // Resolved from cookie values only
  | 'default-db' // Resolved from user's default team in database
  | 'first-db' // Resolved from user's first team in database

/**
 * The result of resolving a team for a user.
 * Contains the team ID, slug, and the source of the resolution.
 */
export interface ResolvedTeam {
  id: string
  slug: string
  source: TeamResolutionSource
}
