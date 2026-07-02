'use client'

import LoadingLayout from '@/features/dashboard/loading-layout'
import { DataRetentionExpired } from '@/features/dashboard/sandbox/common/data-retention-expired'
import { useSandboxContext } from '@/features/dashboard/sandbox/context'
import SandboxMetricsCharts from './monitoring-charts'

interface SandboxMonitoringViewProps {
  sandboxId: string
}

export default function SandboxMonitoringView({
  sandboxId,
}: SandboxMonitoringViewProps) {
  const { isSandboxInfoLoading, sandboxInfo } = useSandboxContext()

  if (isSandboxInfoLoading && !sandboxInfo) {
    return <LoadingLayout />
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3 md:p-6">
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden border bg-bg">
        {sandboxInfo?.retentionExpired ? (
          <DataRetentionExpired />
        ) : (
          <SandboxMetricsCharts sandboxId={sandboxId} />
        )}
      </div>
    </div>
  )
}
