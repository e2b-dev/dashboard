'use client'

import { ToastProvider } from '@/ui/primitives/toast'
import { TooltipProvider } from '@/ui/primitives/tooltip'
import { RootProvider } from 'fumadocs-ui/provider'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

interface ClientProvidersProps {
  children: React.ReactNode
}

export default function ClientProviders({ children }: ClientProvidersProps) {
  return (
    <PostHogProvider>
      <RootProvider
        theme={{
          attribute: 'class',
          defaultTheme: 'system',
          enableSystem: true,
          disableTransitionOnChange: true,
        }}
      >
        <TooltipProvider>
          <ToastProvider>{children}</ToastProvider>
        </TooltipProvider>
      </RootProvider>
    </PostHogProvider>
  )
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      return
    }

    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      // Note that PostHog will automatically capture page views and common events
      //
      // This setup utilizes Next.js rewrites to act as a reverse proxy, to improve
      // reliability of client-side tracking & make requests less likely to be intercepted by tracking blockers.
      // https://posthog.com/docs/libraries/next-js#configuring-a-reverse-proxy-to-posthog
      api_host: '/ingest',
      ui_host: 'https://us.posthog.com',
      disable_session_recording: process.env.NODE_ENV !== 'production',
      advanced_disable_toolbar_metrics: true,
      opt_in_site_apps: true,
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') posthog.debug()
      },
    })
  }, [])

  return <PHProvider client={posthog}>{children}</PHProvider>
}
