import type { MetadataRoute } from 'next'
import { NO_INDEX } from '@/lib/utils/flags'

export default function robots(): MetadataRoute.Robots {
  if (NO_INDEX) {
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
