import '@/app/fonts'
import '@/styles/globals.css'

import { ALLOW_SEO_INDEXING } from '@/configs/flags'
import { METADATA } from '@/configs/metadata'
import { BASE_URL } from '@/configs/urls'
import ClientProviders from '@/features/client-providers'
import { GeneralAnalyticsCollector } from '@/features/general-analytics-collector'
import { GTMHead } from '@/features/google-tag-manager'
import { Toaster } from '@/ui/primitives/toaster'
import { Analytics } from '@vercel/analytics/next'
import Head from 'next/head'
import { Metadata } from 'next/types'
import { Suspense } from 'react'
import { Body } from './layout.client'

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    template: '%s - E2B',
    default: METADATA.title,
  },
  description: METADATA.description,
  twitter: {
    title: METADATA.title,
    description: METADATA.description,
  },
  openGraph: {
    title: METADATA.title,
    description: METADATA.description,
  },
  robots: ALLOW_SEO_INDEXING ? 'index, follow' : 'noindex, nofollow',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <Head>
        <GTMHead />
      </Head>
      <Body>
        <ClientProviders>
          {children}
          <Suspense>
            <GeneralAnalyticsCollector />
            <Toaster />
          </Suspense>
        </ClientProviders>
        <Analytics />
      </Body>
    </html>
  )
}
