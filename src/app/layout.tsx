import '@/app/fonts'
import '@/styles/globals.css'

import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import Head from 'next/head'
import type { Metadata } from 'next/types'
import { Suspense } from 'react'
import {
  FAVICON_CONTENT_TYPE,
  FAVICON_SIZE,
  getFaviconHref,
} from '@/configs/favicon'
import ClientProviders from '@/features/client-providers'
import { GeneralAnalyticsCollector } from '@/features/general-analytics-collector'
import { GTMHead } from '@/features/google-tag-manager'
import { Toaster } from '@/ui/primitives/toaster'
import { Body } from './body'

export const metadata: Metadata = {
  icons: {
    icon: [
      {
        url: getFaviconHref(process.env.VERCEL_ENV),
        type: FAVICON_CONTENT_TYPE,
        sizes: `${FAVICON_SIZE.width}x${FAVICON_SIZE.height}`,
      },
    ],
  },
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
