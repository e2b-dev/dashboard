import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { AUTH_URLS } from '@/configs/urls'
import { featureFlags } from '@/core/modules/feature-flags/feature-flags.server'
import { getAuthContext } from '@/core/server/auth'
import { getTeamIdFromSlug } from '@/core/server/functions/team/get-team-id-from-slug'

export const metadata: Metadata = {
  title: 'Connections - E2B',
}

type ConnectionsPageProps = {
  params: Promise<{
    teamSlug: string
  }>
}

export default async function ConnectionsPage({
  params,
}: ConnectionsPageProps) {
  const [{ teamSlug }, authContext] = await Promise.all([
    params,
    getAuthContext(),
  ])

  if (!authContext) {
    redirect(AUTH_URLS.SIGN_IN)
  }

  const teamId = await getTeamIdFromSlug(teamSlug, authContext.accessToken)

  if (!teamId.ok || !teamId.data) {
    notFound()
  }

  const enabledTeams = await featureFlags.getPayload('connectionsTeams', {
    user: {
      id: authContext.user.id,
      email: authContext.user.email ?? undefined,
    },
    team: {
      id: teamId.data,
      slug: teamSlug,
    },
  })

  if (!enabledTeams.includes(teamId.data)) {
    notFound()
  }

  return null
}
