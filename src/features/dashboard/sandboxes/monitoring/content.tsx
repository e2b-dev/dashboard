import { TeamMetricsCharts } from '@/features/dashboard/sandboxes/monitoring/charts/charts'
import SandboxesMonitoringHeader from '@/features/dashboard/sandboxes/monitoring/header'

export interface MonitoringContentParams {
  teamIdOrSlug: string
}

export interface MonitoringContentSearchParams {
  start?: string
  end?: string
}

interface MonitoringContentProps {
  params: Promise<MonitoringContentParams>
  searchParams: Promise<MonitoringContentSearchParams>
}

export default function MonitoringContent({
  params,
  searchParams,
}: MonitoringContentProps) {
  return (
    <div className="flex flex-col h-full relative min-h-0 max-md:overflow-y-auto">
      <SandboxesMonitoringHeader params={params} />
      <div className="flex flex-col flex-1 max-md:min-h-[calc(100vh-3.5rem)] min-h-0">
        <TeamMetricsCharts params={params} searchParams={searchParams} />
      </div>
    </div>
  )
}
