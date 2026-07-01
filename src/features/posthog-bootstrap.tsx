'use client'

import { useEffect } from 'react'
import { useAppPostHogProvider } from '@/features/posthog-provider'

// Feeds the server-known identity into PostHog before init, so the first
// captured pageview is already identified instead of anonymous.
export function PostHogBootstrap({
  distinctId,
  email,
}: {
  distinctId: string
  email?: string
}) {
  const { setBootstrap } = useAppPostHogProvider()

  useEffect(() => {
    setBootstrap({ distinctID: distinctId, email })
  }, [distinctId, email, setBootstrap])

  return null
}
