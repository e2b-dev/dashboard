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
 * Schema for validating team names.
 *
 * @description
 * This schema validates team names with the following rules:
 * 1. Requires non-empty strings (min length 1)
 * 2. Maximum length of 32 characters
 * 3. Trims whitespace from beginning and end
 * 4. Only allows letters, numbers, and spaces
 *
 * Examples that work (valid):
 * - "Team 1" -> "Team 1"
 * - "DevOps2023" -> "DevOps2023"
 * - "Engineering Team" -> "Engineering Team"
 *
 * Examples that don't work (invalid):
 * - "" -> Fails with "Team name cannot be empty"
 * - "   " -> Fails with "Team name cannot be empty" (becomes empty after trim)
 * - "Team@Work" -> Fails with "Team name can only contain letters, numbers, and spaces"
 * - "Dev-Ops" -> Fails with "Team name can only contain letters, numbers, and spaces"
 * - "Very Long Team Name That Exceeds The Character Limit" -> Fails with "Team name cannot be longer than 32 characters"
 *
 * Validation errors:
 * - Empty string or strings that become empty after trim: "Team name cannot be empty"
 * - Strings longer than 32 characters: "Team name cannot be longer than 32 characters"
 * - Strings with special characters: "Team name can only contain letters, numbers, and spaces"
 */
export const TeamNameSchema = z
  .string()
  .trim()
  .min(1, { message: 'Team name cannot be empty' })
  .max(32, { message: 'Team name cannot be longer than 32 characters' })
  .regex(/^[a-zA-Z0-9\s]+$/, {
    message: 'Team name can only contain letters, numbers, and spaces',
  })

// Shared schemas

const UpdateTeamNameSchema = z.object({
  teamId: z.string().uuid(),
  name: TeamNameSchema,
})

const CreateTeamSchema = z.object({
  name: TeamNameSchema,
})

export { UpdateTeamNameSchema, CreateTeamSchema }
