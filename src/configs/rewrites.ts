import { DomainConfig } from '@/types/rewrites.types'

export const LANDING_PAGE_DOMAIN = 'www.e2b-landing-page.com'
export const DOCS_NEXT_DOMAIN = 'e2b-docs.vercel.app'

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
      {
        path: '/blog/category',
        pathPreprocessor: (path) => path.replace('/blog', ''),
        sitemapMatchPath: '/category',
      },
      { path: '/blog' },
    ],
  },
]

// Middleware native rewrite config
export const MIDDLEWARE_REWRITE_CONFIG: DomainConfig[] = [
  {
    domain: LANDING_PAGE_DOMAIN,
    rules: [{ path: '/cookbook' }],
  },
  {
    domain: DOCS_NEXT_DOMAIN,
    rules: [{ path: '/docs' }],
  },
]
