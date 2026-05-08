import { TeamMetricsCharts } from '@/features/dashboard/sandboxes/monitoring/charts/charts'
import SandboxesMonitoringHeader from '@/features/dashboard/sandboxes/monitoring/header'

type MonitoringSearchParams = {
  start?: string
  end?: string
}

export default async function SandboxesMonitoringPage({
  params,
  searchParams,
}: PageProps<'/dashboard/[teamSlug]/sandboxes/monitoring'> & {
  searchParams: Promise<MonitoringSearchParams>
}) {
  const { start, end } = await searchParams

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
