import {
  MIDDLEWARE_REWRITE_CONFIG,
  RewriteConfigType,
  ROUTE_REWRITE_CONFIG,
} from '@/configs/rewrites'
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

export { getRewriteForPath }
