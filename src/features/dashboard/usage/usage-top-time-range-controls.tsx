'use client'

import { useUsageCharts } from './usage-charts-context'
import { UsageTimeRangeControls } from './usage-time-range-controls'

interface UsageTopTimeRangeControlsProps {
  className?: string
}

export function UsageTopTimeRangeControls({
  className,
}: UsageTopTimeRangeControlsProps) {
  const { timeframe, setTimeframe } = useUsageCharts()

  return (
    <UsageTimeRangeControls
      timeframe={timeframe}
      onTimeRangeChange={setTimeframe}
      className={className}
    />
  )
}
