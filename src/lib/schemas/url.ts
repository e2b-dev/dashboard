import { z } from 'zod'

/**
 * Validates that a string is a well-formed HTTP or HTTPS URL.
 * Unlike z.httpUrl(), this also accepts localhost URLs for local development.
 */
export const httpUrlSchema = z.url({ protocol: /^https?$/ })

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
