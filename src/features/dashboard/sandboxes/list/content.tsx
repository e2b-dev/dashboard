import SandboxesTable from '@/features/dashboard/sandboxes/list/table'
import { getTeamSandboxes } from '@/server/sandboxes/get-team-sandboxes'
import { getTeamSandboxesMetrics } from '@/server/sandboxes/get-team-sandboxes-metrics'
import ErrorBoundary from '@/ui/error'

interface ListContentProps {
  params: Promise<{ teamIdOrSlug: string }>
}

export default async function ListContent({ params }: ListContentProps) {
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
    <div className="flex flex-col h-full relative min-h-0 md:overflow-hidden">
      <SandboxesTable
        initialSandboxes={sandboxes}
        initialMetrics={metricsRes?.data?.metrics || null}
      />
    </div>
  )
}
