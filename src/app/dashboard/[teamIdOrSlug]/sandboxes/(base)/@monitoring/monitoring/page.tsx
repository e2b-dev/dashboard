import LoadingLayout from '@/features/dashboard/loading-layout'
import { TeamMetricsCharts } from '@/features/dashboard/sandboxes/monitoring/charts/charts'
import SandboxesMonitoringHeader from '@/features/dashboard/sandboxes/monitoring/header'
import { Suspense } from 'react'

interface MonitoringPageProps {
  params: Promise<{ teamIdOrSlug: string }>
  searchParams: Promise<{ start?: string; end?: string }>
}

export default async function MonitoringPage({
  params,
  searchParams,
}: MonitoringPageProps) {
  return (
    <div className="flex flex-col h-full relative min-h-0 max-md:overflow-y-auto">
      <Suspense fallback={<LoadingLayout />}>
        <SandboxesMonitoringHeader params={params} />
        <div className="flex flex-col flex-1 max-md:min-h-[calc(100vh-3.5rem)] min-h-0">
          <TeamMetricsCharts params={params} searchParams={searchParams} />
        </div>
      </Suspense>
    </div>
  )
}
