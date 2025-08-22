import { ConcurrentChart } from '@/features/dashboard/sandboxes/monitoring/concurrent-chart'
import { TeamMetricsProvider } from '@/features/dashboard/sandboxes/monitoring/context'
import SandboxesMonitoringHeader from '@/features/dashboard/sandboxes/monitoring/header'

export interface SandboxesMonitoringPageParams {
  teamIdOrSlug: string
}

interface SandboxesMonitoringPageProps {
  params: Promise<SandboxesMonitoringPageParams>
}

export default async function SandboxesMonitoringPage({
  params,
}: SandboxesMonitoringPageProps) {
  return (
    <TeamMetricsProvider>
      <div className="flex flex-col h-full">
        <SandboxesMonitoringHeader params={params} />
        <ConcurrentChart params={params} />
      </div>
    </TeamMetricsProvider>
  )
}
