'use client'

import posthog from 'posthog-js'

export const trackSandboxListInteraction = (
  action: string,
  properties: Record<string, unknown> = {}
) => {
  posthog.capture('sandboxes list interacted', {
    action,
    ...properties,
  })
}
