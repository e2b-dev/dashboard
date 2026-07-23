'use client'

import { useCallback } from 'react'

// OSS: analytics removed; no-op kept so call sites stay identical to console.
export const useSandboxInspectAnalytics = () => {
  const handler = useCallback(
    (_action: string, _properties: Record<string, unknown> = {}) => {},
    []
  )

  return { trackInteraction: handler }
}
