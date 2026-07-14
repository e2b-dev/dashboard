import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { AUTH_URLS } from '@/configs/urls'
import { featureFlags } from '@/core/modules/feature-flags/feature-flags.server'
import { getAuthContext } from '@/core/server/auth'
import { getTeamIdFromSlug } from '@/core/server/functions/team/get-team-id-from-slug'

export const metadata: Metadata = {
  title: 'Integrations - E2B',
}

type IntegrationsPageProps = {
  params: Promise<{
    teamSlug: string
  }>
}

export default async function IntegrationsPage({
  params,
}: IntegrationsPageProps) {
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

  const enabledTeams = await featureFlags.getPayload('integrationsTeams', {
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
