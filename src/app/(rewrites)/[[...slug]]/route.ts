import type { NextRequest } from 'next/server'
import { ALLOW_SEO_INDEXING } from '@/configs/env-flags'
import { BASE_URL } from '@/configs/urls'
import { l, serializeErrorForLog } from '@/core/shared/clients/logger/logger'
import {
  getRewriteForPath,
  rewriteContentPagesHtml,
} from '@/lib/utils/rewrites'

export const dynamic = 'force-dynamic'

const REVALIDATE_TIME = 900 // 15 minutes ttl
const CDN_CACHE_CONTROL = `public, s-maxage=${REVALIDATE_TIME}, stale-while-revalidate=${REVALIDATE_TIME}`

function getRewriteRequestHeaders(): Headers {
  return new Headers({
    Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  })
}

function setRewriteCacheHeaders(headers: Headers): void {
  headers.delete('set-cookie')
  headers.delete('set-cookie2')
  headers.set('Cache-Control', 'public, max-age=0, must-revalidate')
  headers.set('CDN-Cache-Control', CDN_CACHE_CONTROL)
  headers.set('Vercel-CDN-Cache-Control', CDN_CACHE_CONTROL)
}

export async function GET(request: NextRequest): Promise<Response> {
  const url = new URL(request.url)

  // Next.js (versions > 15.3.0) can alias the root path ("/") in `request.url` to
  // the corresponding file path (e.g., "/index") during internal processing.
  // This is a hotfix to normalize the pathname back to "/". We previously tried
  // using `request.nextUrl.pathname` to preserve the original client-requested URL,
  // but that approach did not work as well in practice.
  // This issue does only seem to occur in Vercel Production builds, not in local development or preview deployments.

  // NOTE - Not sure if this is a bug or intended from the Next.js team, but it is what it is.
  // We need to handle this case because @rewrites.ts has a config for rewriting "/" (index),
  // and without this normalization, we would get a 404 in production when Next.js aliases "/" to "/index".
  if (url.pathname === '/index') {
    url.pathname = '/'
  }

  const updateUrlHostname = (newHostname: string) => {
    url.hostname = newHostname
    url.port = ''
    url.protocol = 'https'
  }

  const { config, rule } = getRewriteForPath(url.pathname, 'route')

  if (config) {
    if (rule?.pathPreprocessor) {
      url.pathname = rule.pathPreprocessor(url.pathname)
    }
    updateUrlHostname(config.domain)
  }

  try {
    const notFound = !config
    const fetchUrl = notFound ? `${BASE_URL}/not-found` : url.toString()

    const res = await fetch(fetchUrl, {
      headers: notFound
        ? new Headers(request.headers)
        : getRewriteRequestHeaders(),
      redirect: 'follow',
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

    if (!notFound) {
      setRewriteCacheHeaders(newHeaders)
    }

    if (contentType?.startsWith('text/html')) {
      let html = await res.text()

      // remove content-encoding header to ensure proper rendering
      newHeaders.delete('content-encoding')
      newHeaders.delete('content-length')

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

    return new Response(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: newHeaders,
    })
  } catch (error) {
    l.error({
      key: 'url_rewrite:unexpected_error',
      error: serializeErrorForLog(error),
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
