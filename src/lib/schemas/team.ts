import { z } from 'zod'

export const TeamIdOrSlugSchema = z.union([
  z.uuid(),
  z
    .string()
    .regex(
      /^[a-z0-9]+(-[a-z0-9]+)*$/i,
      'Must be a valid slug (words separated by hyphens)'
    ),
])
