import { z } from 'zod'

export const NonEmptyStringSchema = z.string().trim().min(1)
