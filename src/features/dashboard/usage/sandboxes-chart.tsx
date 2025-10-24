'use client'

import { AnimatedMetricDisplay } from '@/features/dashboard/sandboxes/monitoring/charts/animated-metric-display'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardHeader } from '@/ui/primitives/card'
import { useCallback } from 'react'
import ComputeUsageChart from './compute-usage-chart'
import { useUsageCharts } from './usage-charts-context'
import { UsageTimeRangeControls } from './usage-time-range-controls'

export function SandboxesChart({ className }: { className?: string }) {
  const {
    filledSeries,
    setHoveredTimestamp,
    timeframe,
    setTimeframe,
    displayValues,
  } = useUsageCharts()

  const handleBrushEnd = useCallback(
    (start: number, end: number) => {
      setTimeframe(start, end)
    },
    [setTimeframe]
  )

  const handleTooltipValueChange = useCallback(
    (timestamp: number) => {
      setHoveredTimestamp(timestamp)
    },
    [setHoveredTimestamp]
  )

  const handleHoverEnd = useCallback(() => {
    setHoveredTimestamp(null)
  }, [setHoveredTimestamp])

  const { displayValue, label, timestamp } = displayValues.sandboxes

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      <CardHeader className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="prose-label-highlight uppercase max-md:text-sm">
            Started Sandboxes
          </span>
          <UsageTimeRangeControls
            timeframe={timeframe}
            onTimeRangeChange={setTimeframe}
          />
        </div>
        <AnimatedMetricDisplay
          value={displayValue}
          label={label}
          timestamp={timestamp}
        />
      </CardHeader>
      <CardContent className="flex flex-col gap-4 flex-1 min-h-0">
        <div className="flex-1 min-h-0">
          <ComputeUsageChart
            type="sandboxes"
            data={filledSeries.sandboxes}
            onTooltipValueChange={handleTooltipValueChange}
            onHoverEnd={handleHoverEnd}
            onBrushEnd={handleBrushEnd}
          />
        </div>
      </CardContent>
    </Card>
  )
}
