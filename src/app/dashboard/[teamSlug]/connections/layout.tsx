import { notFound, redirect } from 'next/navigation'
import { AUTH_URLS } from '@/configs/urls'
import { featureFlags } from '@/core/modules/feature-flags/feature-flags.server'
import { getAuthContext } from '@/core/server/auth'
import { getTeamIdFromSlug } from '@/core/server/functions/team/get-team-id-from-slug'

type ConnectionsLayoutProps = {
  children: React.ReactNode
  params: Promise<{ teamSlug: string }>
}

export default async function ConnectionsLayout({
  children,
  params,
}: ConnectionsLayoutProps) {
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

  const connectionsEnabled = await featureFlags.isEnabled(
    'connectionsEnabled',
    {
      user: {
        id: authContext.user.id,
        email: authContext.user.email ?? undefined,
      },
      team: {
        id: teamId.data,
        slug: teamSlug,
      },
    }
  )

  if (!connectionsEnabled) {
    notFound()
  }

  return children
}
