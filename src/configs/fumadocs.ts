import { source } from '@/lib/source'
import { createMetadataImage } from 'fumadocs-core/server'
import type { Metadata } from 'next/types'

export const metadataImage = createMetadataImage({
  source,
  imageRoute: 'og',
})

export function createMetadata(override: Metadata): Metadata {
  return {
    ...override,
    openGraph: {
      title: override.title ?? undefined,
      description: override.description ?? undefined,
      url: 'https://fumadocs.vercel.app',
      images: '/banner.png',
      siteName: 'Fumadocs',
      ...override.openGraph,
    },
    twitter: {
      card: 'summary_large_image',
      creator: '@money_is_shark',
      title: override.title ?? undefined,
      description: override.description ?? undefined,
      images: '/banner.png',
      ...override.twitter,
    },
  }
}
