import { DOCUMENTATION_DOMAIN } from '../../next.config.mjs'

export const SITEMAP_EXCLUDE_CONFIG: Array<{
  domain: string
  excludedPathPrefixes: string[]
}> = [
  {
    domain: DOCUMENTATION_DOMAIN,
    excludedPathPrefixes: ['/docs/sdk-reference'],
  },
]
