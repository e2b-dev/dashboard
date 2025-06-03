import {
  MIDDLEWARE_REWRITE_CONFIG,
  RewriteConfigType,
  ROUTE_REWRITE_CONFIG,
} from '@/configs/rewrites'
import { RewriteConfig } from '@/types/rewrites.types'
import * as cheerio from 'cheerio'
import { logError, logWarning } from '@/lib/clients/logger'
import { ERROR_CODES } from '@/configs/logs'

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

      if (
        rule.path !== '/' &&
        (path === rule.path || path.startsWith(rule.path + '/'))
      ) {
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

// --- SEO Tag Rewriter (Cheerio) ---

interface SeoTagOptions {
  pathname: string
  allowIndexing: boolean
}

/**
 * Rewrites SEO meta tags in an HTML document using Cheerio.
 * It removes existing robots meta tags and canonical links,
 * then prepends new ones based on the provided options.
 *
 * @param $ The Cheerio API instance.
 * @param options Configuration options including the pathname and NO_INDEX flag.
 */
function rewriteSeoTags($: cheerio.CheerioAPI, options: SeoTagOptions): void {
  const { pathname, allowIndexing } = options

  $('meta[name="robots"]').remove()
  $('link[rel="canonical"]').remove()

  const robotsContent = allowIndexing ? 'index,follow' : 'noindex,nofollow'

  const formattedPathname = pathname.startsWith('/') ? pathname : `/${pathname}`
  const canonicalUrl = `https://e2b.dev${formattedPathname}`

  const $head = $('head')
  if ($head.length > 0) {
    // Add newline characters for readability in the final HTML source
    $head.prepend(`<link rel="canonical" href="${canonicalUrl}">
`)
    $head.prepend(`<meta name="robots" content="${robotsContent}">
`)
    return
  }

  logWarning(
    'Cheerio SEO Rewriter: <head> tag not found. Cannot insert SEO tags.'
  )
}

/**
 * Rewrites absolute href attributes in an HTML document using Cheerio.
 * It finds <a> and <link> tags whose href starts with the given prefix
 * and replaces the href with a relative path (pathname + search + hash).
 *
 * @param $ The Cheerio API instance.
 * @param rewrittenPrefix The absolute URL prefix (e.g., "https://example.com") to replace.
 */
function rewriteAbsoluteHrefsInDoc(
  $: cheerio.CheerioAPI,
  rewrittenPrefixes: string[]
): void {
  $('a[href]').each((_, element) => {
    const $element = $(element)
    const href = $element.attr('href')

    if (!href || !rewrittenPrefixes.some((prefix) => href.startsWith(prefix))) {
      return
    }

    try {
      const url = new URL(href)
      const relativePath = url.pathname + url.search + url.hash
      $element.attr('href', relativePath)
    } catch (e) {
      // Ignore invalid URLs during rewrite
      logError(
        ERROR_CODES.URL_REWRITE,
        `Cheerio Href Rewriter: Failed to parse or set href="${href}"`,
        e
      )
    }
  })
}

/**
 * Rewrites HTML content for content pages by applying multiple transformations.
 * This includes SEO tag rewrites and absolute href rewrites.
 *
 * @param html The HTML string to modify.
 * @param options Configuration options for the transformations.
 * @returns The modified HTML string.
 */
function rewriteContentPagesHtml(
  html: string,
  options: {
    seo: SeoTagOptions
    hrefPrefixes?: string[]
  }
): string {
  const $ = cheerio.load(html)

  rewriteSeoTags($, options.seo)

  if (options.hrefPrefixes) {
    rewriteAbsoluteHrefsInDoc($, options.hrefPrefixes)
  }

  return $.html()
}

export { getRewriteForPath, rewriteContentPagesHtml }
