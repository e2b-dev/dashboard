import { z } from 'zod'

export const TeamSlugSchema = z.string().trim().min(1)
