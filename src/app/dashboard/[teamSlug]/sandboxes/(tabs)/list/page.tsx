import { Suspense } from 'react'
import { featureFlags } from '@/core/modules/feature-flags/feature-flags.server'
import { getAuthContext } from '@/core/server/auth'
import { getTeamIdFromSlug } from '@/core/server/functions/team/get-team-id-from-slug'
import LoadingLayout from '@/features/dashboard/loading-layout'
import SandboxesTable from '@/features/dashboard/sandboxes/list/table'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'

export default async function SandboxesListPage({
  params,
}: PageProps<'/dashboard/[teamSlug]/sandboxes/list'>) {
  const { teamSlug } = await params
  const authContext = await getAuthContext()
  const teamIdResult = authContext
    ? await getTeamIdFromSlug(teamSlug, authContext.accessToken)
    : null
  const teamId = teamIdResult?.ok ? teamIdResult.data : null
  const newSandboxListEnabled = authContext
    ? await featureFlags.isEnabled('newSandboxList', {
        user: {
          id: authContext.user.id,
          email: authContext.user.email ?? undefined,
        },
        team: teamId ? { id: teamId, slug: teamSlug } : undefined,
      })
    : false

  if (newSandboxListEnabled) {
    prefetch(
      trpc.sandboxes.getSandboxes.infiniteQueryOptions({
        teamSlug,
        limit: 50,
      })
    )
  } else {
    prefetch(
      trpc.sandboxes.getSandboxes.queryOptions({
        teamSlug,
        limit: 50,
        states: ['running'],
      })
    )
  }

  return (
    <HydrateClient>
      <Suspense fallback={<LoadingLayout />}>
        <SandboxesTable />
      </Suspense>
    </HydrateClient>
  )
}
