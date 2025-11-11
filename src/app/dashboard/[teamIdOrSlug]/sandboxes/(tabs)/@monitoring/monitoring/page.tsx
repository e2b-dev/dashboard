import { TeamMetricsCharts } from '@/features/dashboard/sandboxes/monitoring/charts/charts'
import SandboxesMonitoringHeader from '@/features/dashboard/sandboxes/monitoring/header'

export default async function MonitoringPage({
  params,
  searchParams,
}: PageProps<'/dashboard/[teamIdOrSlug]/sandboxes/monitoring'> & {
  searchParams: Promise<{ start?: string; end?: string }>
}) {
  return (
    <div className="flex flex-col h-full relative min-h-0 max-md:overflow-y-auto">
      <SandboxesMonitoringHeader params={params} />
      <div className="flex flex-col flex-1 max-md:min-h-[calc(100vh-3.5rem)] min-h-0">
        <TeamMetricsCharts params={params} searchParams={searchParams} />
      </div>
    </div>
  )
}
