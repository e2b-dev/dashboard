import {
  LANDING_PAGE_DOMAIN,
  LANDING_PAGE_FRAMER_DOMAIN,
  MIDDLEWARE_REWRITE_CONFIG,
  RewriteConfigType,
  ROUTE_REWRITE_CONFIG,
} from '@/configs/rewrites'
import { BASE_URL } from '@/configs/urls'
import { RewriteConfig } from '@/types/rewrites.types'

function getRewriteForPath(
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

function replaceUrls(
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

export { getRewriteForPath, replaceUrls }
