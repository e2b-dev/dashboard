import '@/app/fonts'
import '@/styles/globals.css'

import type { Metadata } from 'next/types'
import { Suspense } from 'react'
import { getFaviconIcons } from '@/configs/favicon'
import ClientProviders from '@/features/client-providers'
import { Toaster } from '@/ui/primitives/toaster'
import { Body } from './body'

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
  return (
    <html lang="en" suppressHydrationWarning>
      <Body>
        <ClientProviders>
          {children}
          <Suspense>
            <Toaster />
          </Suspense>
        </ClientProviders>
      </Body>
    </html>
  )
}
