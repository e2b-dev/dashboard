import { z } from 'zod'

export const TeamIdOrSlugSchema = z.union([z.uuid(), z.string()])
