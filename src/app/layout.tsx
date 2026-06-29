import '@/app/fonts'
import '@/styles/globals.css'

import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import Head from 'next/head'
import type { Metadata } from 'next/types'
import { Suspense } from 'react'
import { getFaviconIcons } from '@/configs/favicon'
import ClientProviders from '@/features/client-providers'
import { GTMHead } from '@/features/google-tag-manager'
import { Toaster } from '@/ui/primitives/toaster'
import { Body } from './body'

function getPostHogEnvironment() {
  switch (process.env.VERCEL_ENV) {
    case 'production':
    case 'preview':
    case 'development':
      return process.env.VERCEL_ENV
    default:
      return 'development'
  }
}

export const metadata: Metadata = {
  icons: {
    icon: getFaviconIcons(process.env.VERCEL_ENV),
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const postHogEnabled = !!process.env.NEXT_PUBLIC_POSTHOG_KEY
  const postHogEnvironment = getPostHogEnvironment()

  return (
    <html lang="en" suppressHydrationWarning>
      <Head>
        <GTMHead />
      </Head>
      <Body>
        <ClientProviders
          postHogEnabled={postHogEnabled}
          postHogEnvironment={postHogEnvironment}
        >
          {children}
          <Suspense>
            <Toaster />
          </Suspense>
        </ClientProviders>
        <Analytics />
        <SpeedInsights />
      </Body>
    </html>
  )
}
