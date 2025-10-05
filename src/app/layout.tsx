import '@/app/fonts'
import '@/styles/globals.css'

import { ALLOW_SEO_INDEXING } from '@/configs/flags'
import { METADATA } from '@/configs/metadata'
import ClientProviders from '@/features/client-providers'
import { GeneralAnalyticsCollector } from '@/features/general-analytics-collector'
import { GTMHead } from '@/features/google-tag-manager'
import { Toaster } from '@/ui/primitives/toaster'
import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import Head from 'next/head'
import { Suspense } from 'react'
import { Body } from './layout.client'

export const generateMetadata = () => {
  return {
    title: METADATA.title,
    description: METADATA.description,
    openGraph: METADATA.openGraph,
    twitter: METADATA.twitter,
    robots: ALLOW_SEO_INDEXING ? 'index, follow' : 'noindex, nofollow',
  }
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
        <SpeedInsights />
      </Body>
    </html>
  )
}
