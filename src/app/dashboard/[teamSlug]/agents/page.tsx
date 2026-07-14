import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { AUTH_URLS } from '@/configs/urls'
import { featureFlags } from '@/core/modules/feature-flags/feature-flags.server'
import { getAuthContext } from '@/core/server/auth'
import { getTeamIdFromSlug } from '@/core/server/functions/team/get-team-id-from-slug'

export const metadata: Metadata = {
  title: 'Agents - E2B',
}

type AgentsPageProps = {
  params: Promise<{
    teamSlug: string
  }>
}

export default async function AgentsPage({ params }: AgentsPageProps) {
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

  const agentsEnabled = await featureFlags.isEnabled('agentsEnabled', {
    user: {
      id: authContext.user.id,
      email: authContext.user.email ?? undefined,
    },
    team: {
      id: teamId.data,
      slug: teamSlug,
    },
  })

  if (!agentsEnabled) {
    notFound()
  }

  return null
}
