'use client'

import { usePostHog } from 'posthog-js/react'
import { useCallback } from 'react'

export const useSandboxInspectAnalytics = () => {
  const posthog = usePostHog()

  const handler = useCallback(
    (action: string, properties: Record<string, unknown> = {}) => {
      posthog.capture('sandbox inspect interacted', {
        action,
        ...properties,
      })
    },
    [posthog]
  )

  return { trackInteraction: handler }
}
