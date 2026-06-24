import 'server-only'

import { featureFlags } from '@/core/modules/feature-flags/feature-flags.server'
import { getAuthContext } from '@/core/server/auth'
import { getTeamIdFromSlug } from '@/core/server/functions/team/get-team-id-from-slug'

export async function isNewSandboxListEnabled(teamSlug: string) {
  const authContext = await getAuthContext()

  if (!authContext) {
    return false
  }

  const teamIdResult = await getTeamIdFromSlug(
    teamSlug,
    authContext.accessToken
  )
  const teamId = teamIdResult.ok ? teamIdResult.data : null

  return featureFlags.isEnabled('newSandboxList', {
    user: {
      id: authContext.user.id,
      email: authContext.user.email ?? undefined,
    },
    team: teamId ? { id: teamId, slug: teamSlug } : undefined,
  })
}
