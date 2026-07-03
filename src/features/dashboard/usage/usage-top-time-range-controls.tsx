'use client'

import { useUsageCharts } from './usage-charts-context'
import { UsageDateRangePicker } from './usage-date-range-picker'

interface UsageTopTimeRangeControlsProps {
  className?: string
}

export function UsageTopTimeRangeControls({
  className,
}: UsageTopTimeRangeControlsProps) {
  const { timeframe, setTimeframe } = useUsageCharts()

  return (
    <UsageDateRangePicker
      timeframe={timeframe}
      onTimeRangeChange={setTimeframe}
      className={className}
    />
  )
}
