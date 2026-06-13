import { notFound, redirect } from 'next/navigation'
import { AUTH_URLS } from '@/configs/urls'
import { auth } from '@/core/server/auth'
import { getDashboardFeatures } from '@/core/server/feature-flags/dashboard-features.server'
import { listFeatureFlags } from '@/core/server/feature-flags/list.server'
import { getTeamIdFromSlug } from '@/core/server/functions/team/get-team-id-from-slug'
import { FeatureFlagsTable } from '@/features/dashboard/admin/feature-flags'
import { Page } from '@/features/dashboard/layouts/page'

interface AdminPageProps {
  params: Promise<{
    teamSlug: string
  }>
}

export default async function AdminPage({ params }: AdminPageProps) {
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
    teamSlug,
  }
  const features = await getDashboardFeatures(context)

  if (!features.isAdmin) {
    notFound()
  }

  const flags = await listFeatureFlags(context)

  return (
    <Page>
      <FeatureFlagsTable
        flags={flags}
        teamId={teamIdResult.data}
        teamSlug={teamSlug}
      />
    </Page>
  )
}
