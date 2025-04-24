/**
 * Configuration for SEO-related settings.
 */

/**
 * An array of regular expression strings. Paths matching any of these regexps
 * will return a 410 (Gone) status.
 * Ensure these are valid JavaScript RegExp patterns.
 * Example: ['^/old-blog(/.*)?$', '^/features/removed-feature$']
 */
export const DEPRECATED_PATH_REGEXPS: string[] = [
  '^/ai-agents(/.*)?$', // Matches /ai-agents and all subpaths
  // Add other deprecated regex patterns here if needed
]
