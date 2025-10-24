'use client'

import { AnimatedMetricDisplay } from '@/features/dashboard/sandboxes/monitoring/charts/animated-metric-display'
import { cn } from '@/lib/utils'
import { formatDay, formatNumber } from '@/lib/utils/formatting'
import { Card, CardContent, CardHeader } from '@/ui/primitives/card'
import { useCallback, useMemo } from 'react'
import ComputeUsageChart from './compute-usage-chart'
import { useUsageCharts } from './usage-charts-context'
import { UsageTimeRangeControls } from './usage-time-range-controls'

export function SandboxesChart({ className }: { className?: string }) {
  const {
    data,
    visibleData,
    hoveredTimestamp,
    setHoveredTimestamp,
    timeframe,
    setTimeframe,
  } = useUsageCharts()

  // Calculate total sandboxes from full data
  const totalSandboxes = useMemo(() => {
    if (data.sandboxes.length === 0) return 0
    return data.sandboxes.reduce((acc, item) => acc + item.count, 0)
  }, [data.sandboxes])

  const handleTooltipValueChange = useCallback(
    (timestamp: number) => {
      setHoveredTimestamp(timestamp)
    },
    [setHoveredTimestamp]
  )

  const handleHoverEnd = useCallback(() => {
    setHoveredTimestamp(null)
  }, [setHoveredTimestamp])

  // Display logic - look up value for hovered timestamp
  const { displayValue, label, timestamp } = useMemo(() => {
    if (hoveredTimestamp) {
      // Find the data point for this timestamp
      const dataPoint = data.sandboxes.find((d) => {
        const pointTime = new Date(d.date).getTime()
        // Match within a day's range
        return Math.abs(pointTime - hoveredTimestamp) < 12 * 60 * 60 * 1000
      })

      if (dataPoint) {
        return {
          displayValue: formatNumber(dataPoint.count),
          label: 'on',
          timestamp: formatDay(new Date(hoveredTimestamp).getTime()),
        }
      }
    }
    return {
      displayValue: formatNumber(totalSandboxes),
      label: 'total',
      timestamp: null,
    }
  }, [hoveredTimestamp, totalSandboxes, data.sandboxes])

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
            data={visibleData.sandboxes}
            onTooltipValueChange={handleTooltipValueChange}
            onHoverEnd={handleHoverEnd}
          />
        </div>
      </CardContent>
    </Card>
  )
}
