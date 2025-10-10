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

// Middleware native rewrite config
// we implemented this custom, instead of the next.config.js rewrites,
// because of cloudflare-nextjs security blockage on cloudflare's side.

// TODO: re-evaluate if this is still needed
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
