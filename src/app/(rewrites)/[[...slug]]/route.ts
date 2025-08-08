import sitemap from '@/app/sitemap'
import { ALLOW_SEO_INDEXING } from '@/configs/flags'
import { ROUTE_REWRITE_CONFIG } from '@/configs/rewrites'
import { BASE_URL } from '@/configs/urls'
import { l } from '@/lib/clients/logger'
import {
  getRewriteForPath,
  rewriteContentPagesHtml,
} from '@/lib/utils/rewrites'
import { NextRequest } from 'next/server'
import { serializeError } from 'serialize-error'

export const revalidate = 900
export const dynamic = 'force-static'

const REVALIDATE_TIME = 900 // 15 minutes ttl

export async function GET(request: NextRequest): Promise<Response> {
  const url = new URL(request.url)

  const requestHostname = url.hostname

  const updateUrlHostname = (newHostname: string) => {
    url.hostname = newHostname
    url.port = ''
    url.protocol = 'https'
  }

  const { config, rule } = getRewriteForPath(url.pathname, 'route')

  if (config) {
    if (rule && rule.pathPreprocessor) {
      url.pathname = rule.pathPreprocessor(url.pathname)
    }
    updateUrlHostname(config.domain)
  }

  try {
    const notFound = url.hostname === requestHostname

    // if hostname did not change, we want to make sure it does not cache the route based on the build times hostname (127.0.0.1:3000)
    const fetchUrl = notFound ? `${BASE_URL}/not-found` : url.toString()

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

    const contentType = res.headers.get('Content-Type')
    const newHeaders = new Headers(res.headers)

    if (contentType?.startsWith('text/html')) {
      let html = await res.text()

      // remove content-encoding header to ensure proper rendering
      newHeaders.delete('content-encoding')

      // rewrite absolute URLs pointing to the rewritten domain to relative paths and with correct SEO tags
      if (config) {
        const rewrittenPrefix = `https://${config.domain}`

        html = rewriteContentPagesHtml(html, {
          seo: {
            pathname: url.pathname,
            allowIndexing: ALLOW_SEO_INDEXING,
          },
          hrefPrefixes: [rewrittenPrefix, 'https://e2b.dev'],
        })
      }

      // create a new response with the modified HTML
      const modifiedResponse = new Response(html, {
        status: notFound ? 404 : res.status,
        headers: newHeaders,
      })

      return modifiedResponse
    }

    return res
  } catch (error) {
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
  const sitemapEntries = await sitemap()

  const slugs = sitemapEntries
    .filter((entry) => {
      const url = new URL(entry.url)
      const pathname = url.pathname

      // Check if this path matches any rule in ROUTE_REWRITE_CONFIG
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
          return true
        }
      }
      return false
    })
    .map((entry) => {
      // Map the filtered entries to slug format
      const url = new URL(entry.url)
      const pathname = url.pathname
      const pathSegments = pathname
        .split('/')
        .filter((segment) => segment !== '')
      return { slug: pathSegments.length > 0 ? pathSegments : undefined }
    })

  return slugs
}
