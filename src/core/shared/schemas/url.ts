import { z } from 'zod'

export const relativeUrlSchema = z
  .string()
  .trim()
  .refine(
    (url) => {
      if (!url.startsWith('/')) {
        return false
      }

      if (url.includes('://') || url.startsWith('//')) {
        return false
      }

      return true
    },
    {
      message: 'Must be a relative URL starting with /',
    }
  )
