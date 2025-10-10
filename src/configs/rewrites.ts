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
 * `rewrites` configuration in next.config.js due to Cloudflare WAF compatibility issues.
 *
 * Context: Next.js's native rewrite system seemed to use the `x-middleware-subrequest` header
 * internally, which triggered Cloudflare's managed WAF rules designed to mitigate
 * CVE-2025-29927 (Next.js authentication bypass vulnerability). This causes legitimate
 * rewrite requests to be blocked when the WAF rule is enabled.
 *
 * By handling rewrites directly in our middleware layer and controlling the headers, we avoid using the internal
 * header mechanism and prevent false positives from Cloudflare's security filters.
 *
 * @see https://developers.cloudflare.com/changelog/2025-03-22-next-js-vulnerability-waf/
 * TODO: Re-evaluate if this workaround is still necessary after Cloudflare updates their WAF rules
 */
export const MIDDLEWARE_REWRITE_CONFIG: DomainConfig[] = [
  {
    domain: SDK_REFERENCE_DOMAIN,
    rules: [{ path: '/docs/sdk-reference' }],
  },
  {
    domain: DOCUMENTATION_DOMAIN,
    rules: [{ path: '/docs' }, { path: '/mcp' }],
  },
]
