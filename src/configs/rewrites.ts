import { BASE_URL } from './urls'

export const LANDING_PAGE_DOMAIN = 'www.e2b-landing-page.com'
export const LANDING_PAGE_FRAMER_DOMAIN = 'e2b-landing-page.framer.website'
export const BLOG_FRAMER_DOMAIN = 'e2b-blog.framer.website'
export const DOCS_NEXT_DOMAIN = 'e2b-docs.vercel.app'

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
      { path: '/cookbook' },
      { path: '/contact' },
      {
        path: '/blog/category',
        pathPreprocessor: (path) => path.replace('/blog', ''),
      },
      { path: '/blog' },
    ],
  },
  {
    domain: LANDING_PAGE_FRAMER_DOMAIN,
    rules: [{ path: '/ai-agents' }],
  },
]

// Middleware native rewrite config
export const MIDDLEWARE_REWRITE_CONFIG: DomainConfig[] = [
  {
    domain: DOCS_NEXT_DOMAIN,
    rules: [{ path: '/docs' }],
  },
]

export function getRewriteForPath(
  path: string,
  configType: RewriteConfigType
): RewriteConfig {
  const config =
    configType === 'route' ? ROUTE_REWRITE_CONFIG : MIDDLEWARE_REWRITE_CONFIG

  for (const domainConfig of config) {
    const isIndex = path === '/' || path === ''

    const matchingRule = domainConfig.rules.find((rule) => {
      if (isIndex && rule.path === '/') {
        return rule
      }

      if (path === rule.path || path.startsWith(rule.path + '/')) {
        return rule
      }
    })

    if (matchingRule) {
      return {
        config: domainConfig,
        rule: matchingRule,
      }
    }
  }

  return { config: null, rule: null }
}

export function replaceUrls(
  text: string,
  prefix: string = '',
  suffix: string = ''
): string {
  const pattern = suffix
    ? `(?<url>${prefix}https?://e2b-[^${suffix}]*)/${suffix}`
    : `(?<url>${prefix}https?://e2b-.*)/$`

  const baseUrl = BASE_URL.replace(/^https?:\/\//, '')

  return text
    .replaceAll(new RegExp(pattern, 'g'), (_, url) => url + suffix)
    .replaceAll(`${prefix}${LANDING_PAGE_DOMAIN}`, `${prefix}${baseUrl}`)
    .replaceAll(`${prefix}${LANDING_PAGE_FRAMER_DOMAIN}`, `${prefix}${baseUrl}`)
}

// Types

type RewriteRule = {
  // Path to rewrite
  path: string

  // Optional pathname preprocessor function
  // Executes before the path is rewritten
  pathPreprocessor?: (path: string) => string
}

type DomainConfig = {
  domain: string
  rules: RewriteRule[]
}

type RewriteConfig = {
  config: DomainConfig | null
  rule: RewriteRule | null
}
