import { Suspense } from 'react'
import LoadingLayout from '@/features/dashboard/loading-layout'
import SandboxesTable from '@/features/dashboard/sandboxes/list/table'
import { TeamMetricsCharts } from '@/features/dashboard/sandboxes/monitoring/charts/charts'
import SandboxesMonitoringHeader from '@/features/dashboard/sandboxes/monitoring/header'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'

type SandboxesSearchParams = {
  tab?: string
  start?: string
  end?: string
}

export default async function SandboxesTabsPage({
  params,
  searchParams,
}: PageProps<'/dashboard/[teamSlug]/sandboxes'> & {
  searchParams: Promise<SandboxesSearchParams>
}) {
  const { tab, start, end } = await searchParams
  const activeTab = tab === 'list' ? 'list' : 'monitoring'

  if (activeTab === 'list') {
    const { teamSlug } = await params

    prefetch(
      trpc.sandboxes.getSandboxes.queryOptions({
        teamSlug,
      })
    )

    return (
      <HydrateClient>
        <Suspense fallback={<LoadingLayout />}>
          <SandboxesTable />
        </Suspense>
      </HydrateClient>
    )
  }

  return (
    <div className="flex flex-col h-full relative min-h-0 max-md:overflow-y-auto">
      <SandboxesMonitoringHeader params={params} />
      <div className="flex flex-col flex-1 max-md:min-h-[calc(100vh-3.5rem)] min-h-0">
        <TeamMetricsCharts
          params={params}
          searchParams={Promise.resolve({ start, end })}
        />
      </div>
    </div>
  )
}
