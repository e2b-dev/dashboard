import {
  DOCS_NEXT_DOMAIN,
  LANDING_PAGE_DOMAIN,
  LANDING_PAGE_FRAMER_DOMAIN,
  replaceUrls,
} from '@/configs/domains'
import { ERROR_CODES } from '@/configs/logs'
import { NextRequest } from 'next/server'
import sitemap from '@/app/sitemap'
import { BASE_URL } from '@/configs/urls'

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
      '/contact': LANDING_PAGE_DOMAIN,
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

  try {
    // if hostname did not change, we want to make sure it does not cache the route based on the build times hostname (127.0.0.1:3000)
    const fetchUrl =
      url.hostname === requestHostname
        ? `${BASE_URL}/not-found`
        : url.toString()

    const res = await fetch(fetchUrl, {
      headers: new Headers(request.headers),
      redirect: 'follow',
      // if the hostname is the same, we don't want to cache the response, since it will not be available in build time
      ...(url.hostname === requestHostname
        ? { cache: 'no-store' }
        : {
            next: {
              revalidate: REVALIDATE_TIME,
            },
          }),
    })

    const contentType = res.headers.get('Content-Type')

    if (contentType?.startsWith('text/html')) {
      const html = await res.text()
      const modifiedHtmlBody = replaceUrls(html, url.pathname, 'href="', '">')

      // create new headers without content-encoding to ensure proper rendering
      const newHeaders = new Headers(res.headers)
      newHeaders.delete('content-encoding')

      return new Response(modifiedHtmlBody, {
        status: res.status,
        headers: newHeaders,
      })
    }

    return res
  } catch (error) {
    console.error(ERROR_CODES.URL_REWRITE, error)

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

  const slugs = sitemapEntries.map((entry) => {
    const url = new URL(entry.url)
    const pathname = url.pathname
    const pathSegments = pathname.split('/').filter((segment) => segment !== '')

    return { slug: pathSegments.length > 0 ? pathSegments : undefined }
  })

  return slugs
}
