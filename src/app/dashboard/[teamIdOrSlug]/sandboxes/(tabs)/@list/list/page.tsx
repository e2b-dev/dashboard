import SandboxesTable from '@/features/dashboard/sandboxes/list/table'
import { getTeamSandboxes } from '@/server/sandboxes/get-team-sandboxes'
import { getTeamSandboxesMetrics } from '@/server/sandboxes/get-team-sandboxes-metrics'
import ErrorBoundary from '@/ui/error'

export default async function ListPage({
  params,
}: PageProps<'/dashboard/[teamIdOrSlug]/sandboxes/list'>) {
  const { teamIdOrSlug } = await params

  const sandboxesRes = await getTeamSandboxes({ teamIdOrSlug })

  if (!sandboxesRes?.data || sandboxesRes?.serverError) {
    return (
      <ErrorBoundary
        error={
          {
            name: 'Sandboxes Error',
            message: sandboxesRes?.serverError ?? 'Unknown error',
          } satisfies Error
        }
        description="Could not load sandboxes"
      />
    )
  }

  const maxSandboxesToFetchInitially = 100

  const metricsRes = await getTeamSandboxesMetrics({
    teamIdOrSlug,
    sandboxIds: sandboxesRes.data.sandboxes
      .map((sandbox) => sandbox.sandboxID)
      .slice(0, maxSandboxesToFetchInitially),
  })

  const sandboxes = sandboxesRes.data.sandboxes

  return (
    <SandboxesTable
      initialSandboxes={sandboxes}
      initialMetrics={metricsRes?.data?.metrics || null}
    />
  )
}
