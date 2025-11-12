import { z } from 'zod'

export const TeamIdOrSlugSchema = z.union([
  z.uuid(),
  z.string(),
  // FIXME: Add correct team regex as in db slug generation
  // .regex(
  //   /^[a-z0-9]+(-[a-z0-9]+)*$/i,
  //   'Must be a valid slug (words separated by hyphens)'
  // ),
])
