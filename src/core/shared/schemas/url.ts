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

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]'])

/**
 * True only when `value` is an http(s) URL whose host is an actual loopback
 * address. Parses with the URL constructor instead of prefix-matching, so
 * hosts like `localhost.evil.com` or `localhost@evil.com` are rejected.
 */
export function isLoopbackUrl(value: string): boolean {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return false
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return false
  }

  return LOOPBACK_HOSTNAMES.has(url.hostname)
}

export const loopbackUrlSchema = z.string().refine(isLoopbackUrl, {
  message: 'Must be an http(s) URL pointing at localhost',
})
