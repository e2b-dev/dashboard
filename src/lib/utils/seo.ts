import { logWarning } from '@/lib/clients/logger'
import { WARNING_CODES } from '@/configs/logs'
import micromatch from 'micromatch'
import { DEPRECATED_PATH_PATTERNS } from '@/configs/seo'

/**
 * Checks if a path is deprecated based on the configured glob patterns.
 *
 * @param pathname URL pathname to check against deprecated patterns
 * @returns boolean indicating if the path is deprecated
 */
export function isPathDeprecated(pathname: string): boolean {
  // Normalize the pathname to ensure consistent matching
  const normalizedPath =
    pathname.endsWith('/') && pathname !== '/'
      ? pathname.slice(0, -1) // Remove trailing slash except for root path
      : pathname

  return micromatch.isMatch(normalizedPath, DEPRECATED_PATH_PATTERNS, {
    dot: true, // Match dot files
    nocase: true, // Case insensitive matching
    noglobstar: false, // Enable ** for matching across path segments
    posix: true, // Use forward slashes for path separators
  })
}

/**
 * Checks if a pathname matches any of the deprecated path patterns.
 * Returns a 410 Gone response if the path is deprecated.
 *
 * @param pathname The URL pathname to check
 * @returns A 410 Response if path is deprecated, undefined otherwise
 */
export function checkSEODeprecation(pathname: string): Response | void {
  try {
    if (isPathDeprecated(pathname)) {
      return new Response(null, { status: 410 })
    }
  } catch (e) {
    console.error(e)
    logWarning(WARNING_CODES.SEO, 'Error checking path deprecation:', pathname)
  }
}
