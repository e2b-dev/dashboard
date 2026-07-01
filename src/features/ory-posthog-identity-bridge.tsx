'use client'

import { usePostHog } from 'posthog-js/react'
import { useEffect } from 'react'
import type { AuthUser } from '@/core/modules/auth/models'
import type { TeamModel } from '@/core/modules/teams/models'
import { useAppPostHogProvider } from '@/features/posthog-provider'

export function resetOryPostHogIdentity(
  posthog: ReturnType<typeof usePostHog>
) {
  posthog.reset()
}

export function OryPostHogIdentityBridge({
  user,
  team,
}: {
  user: AuthUser
  team: Pick<TeamModel, 'id' | 'name' | 'slug'>
}) {
  const posthog = usePostHog()
  const { enabled, environment, isLoaded } = useAppPostHogProvider()

  useEffect(() => {
    if (!enabled || !isLoaded) {
      return
    }

    posthog.identify(user.id, {
      environment,
      ...(user.email ? { email: user.email } : {}),
    })
    posthog.group('team', team.id, {
      environment,
      name: team.name,
      slug: team.slug,
    })
  }, [
    enabled,
    environment,
    isLoaded,
    posthog,
    team.id,
    team.name,
    team.slug,
    user.email,
    user.id,
  ])

  return null
}
