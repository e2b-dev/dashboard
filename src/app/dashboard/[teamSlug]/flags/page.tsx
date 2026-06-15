import { notFound, redirect } from 'next/navigation'
import { AUTH_URLS } from '@/configs/urls'
import { auth } from '@/core/server/auth'
import { listFeatureFlags } from '@/core/server/feature-flags/list.server'
import { getTeamIdFromSlug } from '@/core/server/functions/team/get-team-id-from-slug'
import { FeatureFlagsTable } from '@/features/dashboard/flags/feature-flags'
import { Page } from '@/features/dashboard/layouts/page'

interface FlagsPageProps {
  params: Promise<{
    teamSlug: string
  }>
}

export default async function FlagsPage({ params }: FlagsPageProps) {
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

  const context = {
    userId: authContext.user.id,
    teamId: teamIdResult.data,
  }
  const flags = await listFeatureFlags(context)
  const isAdmin = flags.some((flag) => flag.id === 'isAdmin' && flag.value)

  if (!isAdmin) {
    notFound()
  }

  return (
    <Page className="2xl:-my-14">
      <FeatureFlagsTable flags={flags} teamId={teamIdResult.data} />
    </Page>
  )
}
