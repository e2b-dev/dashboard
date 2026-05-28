import { z } from 'zod'

/**
 * Validates that a string is a well-formed HTTP or HTTPS URL.
 *
 * Unlike `z.httpUrl()`, this also accepts localhost / 127.0.0.1 URLs so the
 * email-verification flow works against a local Supabase setup in development.
 *
 * The schema only validates URL structure — redirect safety is enforced
 * downstream by `isExternalOrigin()` and `buildRedirectUrl()` in the auth
 * route handlers, which reconstruct the redirect using the dashboard's own
 * origin and preserve only `pathname` + `searchParams` from the input.
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
