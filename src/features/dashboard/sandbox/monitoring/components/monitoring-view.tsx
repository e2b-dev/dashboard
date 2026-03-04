'use client'

import LoadingLayout from '@/features/dashboard/loading-layout'
import { useSandboxContext } from '@/features/dashboard/sandbox/context'
import SandboxMetricsCharts from './monitoring-charts'

interface SandboxMonitoringViewProps {
  sandboxId: string
}

export default function SandboxMonitoringView({
  sandboxId,
}: SandboxMonitoringViewProps) {
  const { isSandboxInfoLoading } = useSandboxContext()

  if (isSandboxInfoLoading) {
    return <LoadingLayout />
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 md:p-6">
      <SandboxMetricsCharts sandboxId={sandboxId} />
    </div>
  )
}
