import { ConcurrentChart } from '@/features/dashboard/sandboxes/monitoring/concurrent-chart'
import { TeamMetricsProvider } from '@/features/dashboard/sandboxes/monitoring/context'
import SandboxesMonitoringHeader from '@/features/dashboard/sandboxes/monitoring/header'
import { StartRateChart } from '@/features/dashboard/sandboxes/monitoring/start-rate-chart'

export interface SandboxesMonitoringPageParams {
  teamIdOrSlug: string
}

export interface SandboxesMonitoringPageSearchParams {
  charts_start?: string
  charts_end?: string
}

interface SandboxesMonitoringPageProps {
  params: Promise<SandboxesMonitoringPageParams>
  searchParams: Promise<SandboxesMonitoringPageSearchParams>
}

export default async function SandboxesMonitoringPage({
  params,
  searchParams,
}: SandboxesMonitoringPageProps) {
  return (
    <div className="flex flex-1 flex-col md:overflow-hidden">
      <TeamMetricsProvider>
        <div className="flex flex-col h-full">
          <SandboxesMonitoringHeader params={params} />
          <ConcurrentChart params={params} searchParams={searchParams} />
          <StartRateChart params={params} searchParams={searchParams} />
        </div>
      </TeamMetricsProvider>
    </div>
  )
}
