import { ALLOW_SEO_INDEXING } from '@/configs/flags'
import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  if (!ALLOW_SEO_INDEXING) {
    // We serve an empty robots.txt for a 200 status code
    return {
      rules: {},
    }
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `https://e2b.dev/sitemap.xml`,
  }
}
