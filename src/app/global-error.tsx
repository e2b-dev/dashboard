'use client'

import posthog from 'posthog-js'
import { useEffect } from 'react'
import ErrorBoundary from '@/ui/error'

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string }
}) {
  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!key) return

    // global-error renders outside RootLayout/ClientProviders, so PostHogProvider
    // never ran posthog.init. Initialize a minimal client here so root-layout and
    // provider failures are still reported instead of silently dropped.
    if (!posthog.__loaded) {
      posthog.init(key, {
        api_host: '/ph-proxy',
        ui_host: 'https://us.posthog.com',
        capture_exceptions: false,
      })
      posthog.register({
        environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? 'development',
      })
    }

    posthog.captureException(error)
  }, [error])

  return (
    <ErrorBoundary
      description="Sorry, something went wrong with the application."
      error={error}
      report={false}
    />
  )
}
