import type { MetadataRoute } from 'next'
import { NO_INDEX } from '@/lib/utils/flags'

export default function robots(): MetadataRoute.Robots {
  if (NO_INDEX) {
    return {
      rules: {
        userAgent: '*',
        disallow: '/',
      },
    }
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
    },
    sitemap: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/sitemap.xml`,
  }
}
