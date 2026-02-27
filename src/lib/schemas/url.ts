import { z } from 'zod'

/**
 * Absolute URL constrained to HTTP(S) protocols.
 * This intentionally allows localhost/IP hosts for local development flows.
 */
export const absoluteHttpOrHttpsUrlSchema = z.url({ protocol: /^https?$/ })

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
