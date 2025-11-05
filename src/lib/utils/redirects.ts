import { MIDDLEWARE_REDIRECTS, MiddlewareRedirect } from '@/configs/redirects'

/**
 * Finds a middleware redirect configuration for the given pathname.
 *
 * These redirects are primarily used for marketing campaigns that include
 * custom headers like noindex to prevent search engine indexing of
 * temporary campaign URLs.
 *
 * @param pathname - The request pathname to match against redirect sources
 * @returns The matching redirect configuration, or undefined if no match found
 */
export function getMiddlewareRedirectFromPath(
  pathname: string
): MiddlewareRedirect | undefined {
  return MIDDLEWARE_REDIRECTS.find((redirect) => redirect.source === pathname)
}
