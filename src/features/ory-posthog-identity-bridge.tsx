'use client'

import { usePostHog } from 'posthog-js/react'
import { useEffect } from 'react'
import type { AuthUser } from '@/core/modules/auth/models'

export function resetOryPostHogIdentity(
  posthog: ReturnType<typeof usePostHog>
) {
  posthog.reset()
}

export function OryPostHogIdentityBridge({ user }: { user: AuthUser }) {
  const posthog = usePostHog()

  useEffect(() => {
    posthog.identify(user.id, { email: user.email })
  }, [posthog, user.email, user.id])

  return null
}
