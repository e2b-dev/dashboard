import { DOCUMENTATION_DOMAIN } from './documentation'

export const SITEMAP_EXCLUDE_CONFIG: Array<{
  domain: string
  excludedPathPrefixes: string[]
}> = [
  {
    domain: DOCUMENTATION_DOMAIN,
    excludedPathPrefixes: ['/docs/sdk-reference'],
  },
]
