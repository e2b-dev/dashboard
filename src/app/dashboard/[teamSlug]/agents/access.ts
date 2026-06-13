import 'server-only'

import { notFound, redirect } from 'next/navigation'
import { FEATURE_FLAGS } from '@/configs/flags'
import { AUTH_URLS } from '@/configs/urls'
import { auth } from '@/core/server/auth'
import { featureFlags } from '@/core/server/feature-flags/flags.server'
import { getTeamIdFromSlug } from '@/core/server/functions/team/get-team-id-from-slug'

type TeamRouteParams = Promise<{
  teamSlug: string
}>

export async function requireAgentsDashboardAccess(params: TeamRouteParams) {
  const [{ teamSlug }, authContext] = await Promise.all([
    params,
    auth.getAuthContext(),
  ])

  if (!authContext) {
    redirect(AUTH_URLS.SIGN_IN)
  }

  const teamIdResult = await getTeamIdFromSlug(
    teamSlug,
    authContext.accessToken
  )

  if (!teamIdResult.ok || !teamIdResult.data) {
    notFound()
  }

  const isEnabled = await featureFlags.getBoolean(
    FEATURE_FLAGS.agentsDashboard,
    {
      userId: authContext.user.id,
      teamId: teamIdResult.data,
    }
  )

  if (!isEnabled) {
    notFound()
  }

  return { teamSlug }
}
