import { ConcurrentChart } from '@/features/dashboard/sandboxes/monitoring/concurrent-chart'
import SandboxesMonitoringHeader from '@/features/dashboard/sandboxes/monitoring/header'
import { StartRateChart } from '@/features/dashboard/sandboxes/monitoring/start-rate-chart'
import { ChartRegistryProvider } from '@/lib/hooks/use-connected-charts'

export interface SandboxesMonitoringPageParams {
  teamIdOrSlug: string
}

export interface SandboxesMonitoringPageSearchParams {
  plot?: string
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
    <ChartRegistryProvider group="sandboxes-monitoring">
      <div className="flex flex-col h-full relative min-h-0 max-md:overflow-y-auto">
        <SandboxesMonitoringHeader params={params} />
        <div className="flex flex-col flex-1 max-md:min-h-[calc(100vh-3.5rem)] min-h-0">
          <ConcurrentChart params={params} searchParams={searchParams} />
          <StartRateChart params={params} searchParams={searchParams} />
        </div>
      </div>
    </ChartRegistryProvider>
  )
}
