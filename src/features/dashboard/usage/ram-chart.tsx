'use client'

import { AnimatedMetricDisplay } from '@/features/dashboard/sandboxes/monitoring/charts/animated-metric-display'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/utils/formatting'
import { Card, CardContent, CardHeader } from '@/ui/primitives/card'
import { useCallback, useMemo } from 'react'
import ComputeUsageChart from './compute-usage-chart'
import { useUsageCharts } from './usage-charts-context'
import { UsageTimeRangeControls } from './usage-time-range-controls'

export function RAMChart({ className }: { className?: string }) {
  const {
    data,
    visibleData,
    hoveredTimestamp,
    setHoveredTimestamp,
    timeframe,
    setTimeframe,
  } = useUsageCharts()

  const totalRAM = useMemo(() => {
    if (data.compute.length === 0) return 0
    return data.compute.reduce((acc, item) => acc + item.ram_gb_hours, 0)
  }, [data.compute])

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
      const dataPoint = data.compute.find((d) => {
        const pointTime = new Date(d.date).getTime()
        // Match within a day's range
        return Math.abs(pointTime - hoveredTimestamp) < 12 * 60 * 60 * 1000
      })

      if (dataPoint) {
        return {
          displayValue: formatNumber(dataPoint.ram_gb_hours),
          label: 'on',
          timestamp: new Date(hoveredTimestamp).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          }),
        }
      }
    }
    return {
      displayValue: formatNumber(totalRAM),
      label: 'total',
      timestamp: null,
    }
  }, [hoveredTimestamp, totalRAM, data.compute])

  return (
    <Card className={cn('h-full flex flex-col', className)}>
      <CardHeader className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="prose-label-highlight uppercase max-md:text-sm">
            RAM Hours
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
            type="ram"
            data={visibleData.compute}
            onTooltipValueChange={handleTooltipValueChange}
            onHoverEnd={handleHoverEnd}
          />
        </div>
      </CardContent>
    </Card>
  )
}
