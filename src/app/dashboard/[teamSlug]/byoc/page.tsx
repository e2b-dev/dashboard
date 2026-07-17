import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import { AUTH_URLS } from '@/configs/urls'
import { featureFlags } from '@/core/modules/feature-flags/feature-flags.server'
import { getAuthContext } from '@/core/server/auth'
import { getTeamIdFromSlug } from '@/core/server/functions/team/get-team-id-from-slug'
import { ByocSetup } from '@/features/dashboard/byoc/byoc-setup'

export const metadata: Metadata = {
  title: 'BYOC - E2B',
}

type ByocPageProps = {
  params: Promise<{
    teamSlug: string
  }>
}

export default async function ByocPage({ params }: ByocPageProps) {
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

  const byocSetup = await featureFlags.getPayload('byocSetup', {
    user: {
      id: authContext.user.id,
      email: authContext.user.email ?? undefined,
    },
    team: {
      id: teamId.data,
      slug: teamSlug,
    },
  })

  if (!byocSetup.enabled) {
    notFound()
  }

  return <ByocSetup config={byocSetup} />
}
