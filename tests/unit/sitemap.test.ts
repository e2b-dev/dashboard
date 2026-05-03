import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LANDING_PAGE_DOMAIN } from '@/configs/rewrites'
import { DOCUMENTATION_DOMAIN } from '../../next.config.mjs'

vi.mock('@/configs/flags', () => ({
  ALLOW_SEO_INDEXING: true,
}))

import { constructSitemap } from '@/app/sitemap'

describe('constructSitemap', () => {
  const fetchMock = vi.fn<typeof fetch>()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetAllMocks()
  })

  it('excludes sdk reference paths from the merged sitemap', async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = input instanceof URL ? input.toString() : String(input)

      if (url === `https://${LANDING_PAGE_DOMAIN}/sitemap.xml`) {
        return new Response(
          `
            <urlset>
              <url>
                <loc>https://${LANDING_PAGE_DOMAIN}/pricing</loc>
              </url>
            </urlset>
          `,
          {
            status: 200,
            headers: {
              'Content-Type': 'application/xml',
            },
          }
        )
      }

      if (url === `https://${DOCUMENTATION_DOMAIN}/sitemap.xml`) {
        return new Response(
          `
            <urlset>
              <url>
                <loc>https://${DOCUMENTATION_DOMAIN}/docs/quickstart</loc>
              </url>
              <url>
                <loc>https://${DOCUMENTATION_DOMAIN}/docs/sdk-reference</loc>
              </url>
              <url>
                <loc>https://${DOCUMENTATION_DOMAIN}/docs/sdk-reference/python</loc>
              </url>
            </urlset>
          `,
          {
            status: 200,
            headers: {
              'Content-Type': 'application/xml',
            },
          }
        )
      }

      throw new Error(`Unexpected sitemap fetch: ${url}`)
    })

    const sitemap = await constructSitemap()
    const urls = sitemap.map((entry) => entry.url)

    expect(urls).toContain('https://e2b.dev/pricing')
    expect(urls).toContain('https://e2b.dev/docs/quickstart')
    expect(urls).not.toContain('https://e2b.dev/docs/sdk-reference')
    expect(urls).not.toContain('https://e2b.dev/docs/sdk-reference/python')
  })
})
