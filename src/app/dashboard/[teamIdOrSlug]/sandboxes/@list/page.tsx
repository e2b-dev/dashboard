import SandboxesTable from '@/features/dashboard/sandboxes/list/table'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'
import { getTeamSandboxes } from '@/server/sandboxes/get-team-sandboxes'
import { getTeamSandboxesMetrics } from '@/server/sandboxes/get-team-sandboxes-metrics'
import ErrorBoundary from '@/ui/error'

interface PageProps {
  params: Promise<{
    teamIdOrSlug: string
  }>
}

export default async function Page({ params }: PageProps) {
  const { teamIdOrSlug } = await params

  return <PageContent teamIdOrSlug={teamIdOrSlug} />
}

interface PageContentProps {
  teamIdOrSlug: string
}

async function PageContent({ teamIdOrSlug }: PageContentProps) {
  const teamId = await resolveTeamIdInServerComponent(teamIdOrSlug)

  const sandboxesRes = await getTeamSandboxes({ teamId })

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
    teamId,
    sandboxIds: sandboxesRes.data.sandboxes
      .map((sandbox) => sandbox.sandboxID)
      .slice(0, maxSandboxesToFetchInitially),
  })

  const sandboxes = sandboxesRes.data.sandboxes

  return (
    <div className="flex flex-col h-full relative min-h-0 md:overflow-hidden">
      <SandboxesTable
        sandboxes={sandboxes}
        initialMetrics={metricsRes?.data?.metrics || null}
      />
    </div>
  )
}
