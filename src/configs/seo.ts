/**
 * Configuration for SEO-related settings.
 */

/**
 * An array of glob patterns for deprecated routes that will return a 410 (Gone) status.
 *
 * Pattern syntax examples:
 * - '/ai-agents' - Exact match for /ai-agents
 * - '/ai-agents/*' - Matches a single segment (e.g., /ai-agents/foo)
 * - '/ai-agents/**' - Matches multiple segments (e.g., /ai-agents/foo/bar)
 * - '/ai-agents/{foo,bar}' - Matches /ai-agents/foo or /ai-agents/bar
 * - '/ai-agents/!(foo|bar)' - Matches anything except /ai-agents/foo or /ai-agents/bar
 */
export const DEPRECATED_PATH_PATTERNS = [
  '/ai-agents/**', // Match any path under /ai-agents
]
