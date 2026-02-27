'use client'

import SandboxMetricsCharts from './monitoring-charts'

interface SandboxMonitoringViewProps {
  sandboxId: string
}

export default function SandboxMonitoringView({
  sandboxId,
}: SandboxMonitoringViewProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-3 md:p-6">
      <SandboxMetricsCharts sandboxId={sandboxId} />
    </div>
  )
}
