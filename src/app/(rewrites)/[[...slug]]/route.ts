import sitemap from '@/app/sitemap'
import { ALLOW_SEO_INDEXING } from '@/configs/flags'
import { ROUTE_REWRITE_CONFIG } from '@/configs/rewrites'
import { BASE_URL } from '@/configs/urls'
import { l } from '@/lib/clients/logger/logger'
import {
  getRewriteForPath,
  rewriteContentPagesHtml,
} from '@/lib/utils/rewrites'
import { NextRequest } from 'next/server'
import { serializeError } from 'serialize-error'

export const revalidate = 30
export const runtime = 'nodejs'
// all paths that are not in generateStaticParams will be 404
export const dynamicParams = false

const REVALIDATE_TIME = 29

export async function GET(request: NextRequest): Promise<Response> {
  const url = new URL(request.url)

  console.log('[REWRITE_ROUTE] Start', {
    pathname: url.pathname,
    hostname: url.hostname,
    fullUrl: request.url,
  })

  const requestHostname = url.hostname

  const updateUrlHostname = (newHostname: string) => {
    url.hostname = newHostname
    url.port = ''
    url.protocol = 'https'
  }

  const { config, rule } = getRewriteForPath(url.pathname, 'route')

  console.log('[REWRITE_ROUTE] Rewrite config match', {
    hasConfig: !!config,
    domain: config?.domain,
    matchedRulePath: rule?.path,
    hasPathPreprocessor: !!(rule && rule.pathPreprocessor),
  })

  if (config) {
    if (rule && rule.pathPreprocessor) {
      const originalPathname = url.pathname
      url.pathname = rule.pathPreprocessor(url.pathname)
      console.log('[REWRITE_ROUTE] Path preprocessed', {
        original: originalPathname,
        processed: url.pathname,
      })
    }
    updateUrlHostname(config.domain)
    console.log('[REWRITE_ROUTE] Hostname updated', {
      from: requestHostname,
      to: config.domain,
    })
  }

  try {
    const notFound = url.hostname === requestHostname

    console.log('[REWRITE_ROUTE] Not found check', {
      notFound,
      urlHostname: url.hostname,
      requestHostname,
    })

    // if hostname did not change, we want to make sure it does not cache the route based on the build times hostname (127.0.0.1:3000)
    const fetchUrl = notFound ? `${BASE_URL}/not-found` : url.toString()

    console.log('[REWRITE_ROUTE] Fetching', {
      fetchUrl,
      notFound,
      cacheStrategy: notFound ? 'no-store' : `revalidate: ${REVALIDATE_TIME}`,
    })

    const res = await fetch(fetchUrl, {
      headers: new Headers(request.headers),
      redirect: 'follow',
      // if the hostname is the same, we don't want to cache the response, since it will not be available in build time
      ...(notFound
        ? { cache: 'no-store' }
        : {
            next: {
              revalidate: REVALIDATE_TIME,
            },
          }),
    })

    console.log('[REWRITE_ROUTE] Fetch complete', {
      status: res.status,
      statusText: res.statusText,
      contentType: res.headers.get('Content-Type'),
      contentLength: res.headers.get('Content-Length'),
    })

    const contentType = res.headers.get('Content-Type')
    const newHeaders = new Headers(res.headers)

    if (contentType?.startsWith('text/html')) {
      console.log('[REWRITE_ROUTE] Processing HTML response', {
        htmlLength: 'fetching...',
      })

      let html = await res.text()

      console.log('[REWRITE_ROUTE] HTML fetched', {
        htmlLength: html.length,
        hasConfig: !!config,
      })

      // remove content-encoding header to ensure proper rendering
      newHeaders.delete('content-encoding')

      // rewrite absolute URLs pointing to the rewritten domain to relative paths and with correct SEO tags
      if (config) {
        const rewrittenPrefix = `https://${config.domain}`

        console.log('[REWRITE_ROUTE] Rewriting HTML content', {
          pathname: url.pathname,
          allowIndexing: ALLOW_SEO_INDEXING,
          hrefPrefixes: [rewrittenPrefix, 'https://e2b.dev'],
        })

        html = rewriteContentPagesHtml(html, {
          seo: {
            pathname: url.pathname,
            allowIndexing: ALLOW_SEO_INDEXING,
          },
          hrefPrefixes: [rewrittenPrefix, 'https://e2b.dev'],
        })

        console.log('[REWRITE_ROUTE] HTML rewrite complete', {
          newHtmlLength: html.length,
        })
      }

      // create a new response with the modified HTML
      const modifiedResponse = new Response(html, {
        status: notFound ? 404 : res.status,
        headers: newHeaders,
      })

      console.log('[REWRITE_ROUTE] Returning HTML response', {
        status: modifiedResponse.status,
        notFound,
      })

      return modifiedResponse
    }

    console.log('[REWRITE_ROUTE] Returning non-HTML response', {
      contentType,
      status: res.status,
    })

    return res
  } catch (error) {
    console.error('[REWRITE_ROUTE] Error caught', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    l.error({
      key: 'url_rewrite:unexpected_error',
      error: serializeError(error),
    })

    return new Response(
      `Proxy Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      {
        status: 502,
        headers: { 'Content-Type': 'text/plain' },
      }
    )
  }
}

export async function generateStaticParams() {
  console.log('[REWRITE_ROUTE] generateStaticParams started')

  const sitemapEntries = await sitemap()

  console.log('[REWRITE_ROUTE] Sitemap entries', {
    totalEntries: sitemapEntries.length,
    sampleUrls: sitemapEntries.slice(0, 5).map((e) => e.url),
  })

  const slugs = sitemapEntries
    .filter((entry) => {
      const url = new URL(entry.url)
      const pathname = url.pathname

      // check if this path matches any rule in ROUTE_REWRITE_CONFIG
      for (const domainConfig of ROUTE_REWRITE_CONFIG) {
        const isIndex = pathname === '/' || pathname === ''
        const matchingRule = domainConfig.rules.find((rule) => {
          if (isIndex && rule.path === '/') {
            return true
          }
          if (pathname === rule.path || pathname.startsWith(rule.path + '/')) {
            return true
          }
          return false
        })

        if (matchingRule) {
          console.log('[REWRITE_ROUTE] Matched path', {
            pathname,
            isIndex,
            rulePath: matchingRule.path,
            domain: domainConfig.domain,
          })
          return true
        }
      }
      return false
    })
    .map((entry) => {
      // map the filtered entries to slug format
      const url = new URL(entry.url)
      const pathname = url.pathname
      const pathSegments = pathname
        .split('/')
        .filter((segment) => segment !== '')

      // for index, this means the slug is an empty array
      const result = { slug: pathSegments }

      console.log('[REWRITE_ROUTE] Generated param', {
        pathname,
        slug: result.slug,
        isIndex: result.slug.length === 0,
      })

      return result
    })

  console.log('[REWRITE_ROUTE] generateStaticParams complete', {
    totalParams: slugs.length,
    params: slugs,
  })

  return slugs
}
