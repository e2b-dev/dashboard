import { DomainConfig } from '@/types/rewrites.types'

export const LANDING_PAGE_DOMAIN = 'www.e2b-landing-page.com'
export const SDK_REFERENCE_DOMAIN = 'e2b-docs.vercel.app'
// NOTE: DOCUMENTATION_DOMAIN has to be defined in next.config.mjs, such that we are able to use it there
import { DOCUMENTATION_DOMAIN } from '../../next.config.mjs'

// Currently we have two locations for rewrites to happen.

// 1. Route handler catch-all rewrite config (cached on build time with revalidation)
// 2. Middleware native rewrite config (dynamic)
export type RewriteConfigType = 'route' | 'middleware'

// Route handler catch-all rewrite config
// IMPORTANT: The order of the rules is important, as the first matching rule will be used
export const ROUTE_REWRITE_CONFIG: DomainConfig[] = [
  {
    domain: LANDING_PAGE_DOMAIN,
    rules: [
      { path: '/' },
      { path: '/terms' },
      { path: '/privacy' },
      { path: '/pricing' },
      { path: '/thank-you' },
      { path: '/contact' },
      { path: '/research' },
      { path: '/startups' },
      { path: '/enterprise' },
      { path: '/careers' },
      {
        path: '/blog/category',
        pathPreprocessor: (path) => path.replace('/blog', ''),
        sitemapMatchPath: '/category',
      },
      { path: '/blog' },
      { path: '/cookbook' },
    ],
  },
]

/**
 * Middleware native rewrite config
 *
 * We implement rewrites directly in middleware rather than using Next.js's built-in
 * `rewrites` configuration in next.config.js because we need to set custom request
 * and response headers for these rewritten requests.
 *
 * Specifically, we need to:
 * - Add custom headers to the request (e.g., x-e2b-should-index for SEO control)
 * - Set custom response headers (e.g., X-Robots-Tag for search engine indexing)
 * - Have fine-grained control over the rewrite behavior based on environment variables
 *
 * Next.js's native rewrite configuration doesn't provide this level of header manipulation
 * capability, so we handle these rewrites in our middleware layer where we have full
 * control over the request/response cycle.
 */
export const MIDDLEWARE_REWRITE_CONFIG: DomainConfig[] = [
  {
    domain: SDK_REFERENCE_DOMAIN,
    rules: [{ path: '/docs/sdk-reference' }],
  },
  {
    domain: DOCUMENTATION_DOMAIN,
    rules: [
      { path: '/docs' },
      { path: '/mcp' },
      { path: '/llms.txt' },
      { path: '/llms-full.txt' },
    ],
  },
]
