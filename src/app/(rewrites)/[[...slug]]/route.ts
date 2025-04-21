import { getRewriteForPath } from '@/lib/utils/rewrites'
import { ERROR_CODES } from '@/configs/logs'
import { NextRequest } from 'next/server'
import sitemap from '@/app/sitemap'
import { BASE_URL } from '@/configs/urls'
import { NO_INDEX } from '@/lib/utils/flags'
import { logError } from '@/lib/clients/logger'
import { HTMLRewriter } from '@worker-tools/html-rewriter/base64'

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

      // Create new headers without content-encoding to ensure proper rendering
      const newHeaders = new Headers(res.headers)
      newHeaders.delete('content-encoding')

      // Rewrite absolute URLs pointing to the rewritten domain to relative paths
      const rewriter = new HTMLRewriter()
      if (config) {
        const rewrittenPrefix = `https://${config.domain}`

        rewriter
          .on('a[href]', {
            element(element: Element) {
              const href = element.getAttribute('href')
              if (href?.startsWith(rewrittenPrefix)) {
                try {
                  const url = new URL(href)
                  element.setAttribute(
                    'href',
                    url.pathname + url.search + url.hash
                  )
                } catch (e) {
                  // Ignore invalid URLs
                  console.error('Failed to parse URL for rewriting:', href, e)
                }
              }
            },
          })
          .on('link[href]', {
            element(element: Element) {
              const href = element.getAttribute('href')
              if (href?.startsWith(rewrittenPrefix)) {
                try {
                  const url = new URL(href)
                  element.setAttribute(
                    'href',
                    url.pathname + url.search + url.hash
                  )
                } catch (e) {
                  // Ignore invalid URLs
                  console.error('Failed to parse URL for rewriting:', href, e)
                }
              }
            },
          })
      }

      // Add noindex header if NO_INDEX is set
      if (NO_INDEX) {
        newHeaders.set('X-Robots-Tag', 'noindex, nofollow')
      }

      // Create a new response with the modified HTML
      const modifiedResponse = new Response(html, {
        status: res.status,
        headers: newHeaders,
      })

      // Apply the HTMLRewriter transformations
      return rewriter.transform(modifiedResponse)
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
