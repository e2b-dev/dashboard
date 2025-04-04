import {
  DOCS_NEXT_DOMAIN,
  LANDING_PAGE_DOMAIN,
  LANDING_PAGE_FRAMER_DOMAIN,
  replaceUrls,
} from '@/configs/domains'
import { ERROR_CODES } from '@/configs/logs'
import { logError } from '@/lib/clients/logger'
import { NextRequest } from 'next/server'

export const revalidate = 900

const REVALIDATE_TIME = 900 // 15 minutes ttl

export async function GET(request: NextRequest): Promise<Response> {
  const url = new URL(request.url)
  const requestHostname = url.hostname

  const updateUrlHostname = (newHostname: string) => {
    url.hostname = newHostname
    url.port = ''
    url.protocol = 'https'
  }

  if (url.pathname === '' || url.pathname === '/') {
    updateUrlHostname(LANDING_PAGE_DOMAIN)
  } else if (url.pathname.startsWith('/blog/category')) {
    url.pathname = url.pathname.replace(/^\/blog/, '')
    updateUrlHostname(LANDING_PAGE_DOMAIN)
  } else {
    const hostnameMap: Record<string, string> = {
      '/terms': LANDING_PAGE_DOMAIN,
      '/privacy': LANDING_PAGE_DOMAIN,
      '/pricing': LANDING_PAGE_DOMAIN,
      '/cookbook': LANDING_PAGE_DOMAIN,
      '/changelog': LANDING_PAGE_DOMAIN,
      '/blog': LANDING_PAGE_DOMAIN,
      '/ai-agents': LANDING_PAGE_FRAMER_DOMAIN,
      '/docs': DOCS_NEXT_DOMAIN,
    }

    const matchingPath = Object.keys(hostnameMap).find(
      (path) => url.pathname === path || url.pathname.startsWith(path + '/')
    )

    if (matchingPath) {
      updateUrlHostname(hostnameMap[matchingPath])
    }
  }

  if (url.hostname === requestHostname) {
    url.pathname = '/not-found'
  }

  try {
    const headers = new Headers(request.headers)
    headers.delete('host') // prevent host header conflicts

    const res = await fetch(url.toString(), {
      headers,
      redirect: 'follow',
      cache: 'force-cache',
      next: {
        revalidate: REVALIDATE_TIME,
      },
    })

    const contentType = res.headers.get('Content-Type')

    if (contentType?.startsWith('text/html')) {
      const html = await res.text()
      const modifiedHtmlBody = replaceUrls(html, url.pathname, 'href="', '">')

      // create new headers without content-encoding to ensure proper rendering
      const newHeaders = new Headers(res.headers)
      newHeaders.delete('content-encoding')

      // add cache control headers if not already present
      if (!newHeaders.has('cache-control')) {
        newHeaders.set(
          'cache-control',
          `public, max-age=${REVALIDATE_TIME}, s-maxage=${REVALIDATE_TIME}, stale-while-revalidate=86400`
        )
      }

      return new Response(modifiedHtmlBody, {
        status: res.status,
        headers: newHeaders,
      })
    }

    return res
  } catch (error) {
    logError(ERROR_CODES.URL_REWRITE, error)

    return new Response(
      `Proxy Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      {
        status: 502,
        headers: { 'Content-Type': 'text/plain' },
      }
    )
  }
}
