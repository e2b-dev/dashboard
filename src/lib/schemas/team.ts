import { z } from 'zod'

export const TeamIdOrSlugSchema = z.union([
  z.uuid(),
  z
    .string()
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/,
      'Must be a valid team slug (lowercase alphanumeric, separated by hyphens)'
    ),
])
