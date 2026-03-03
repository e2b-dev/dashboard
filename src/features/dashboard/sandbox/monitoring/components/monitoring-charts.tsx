'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { useSandboxMonitoringController } from '../state/use-sandbox-monitoring-controller'
import { buildMonitoringChartModel } from '../utils/chart-model'
import { SANDBOX_MONITORING_PERCENT_MAX } from '../utils/constants'
import MonitoringChartSection from './monitoring-chart-section'
import DiskChartHeader from './monitoring-disk-chart-header'
import ResourceChartHeader from './monitoring-resource-chart-header'
import SandboxMetricsChart from './monitoring-sandbox-metrics-chart'
import SandboxMonitoringTimeRangeControls from './monitoring-time-range-controls'

interface SandboxMetricsChartsProps {
  sandboxId: string
}

export default function SandboxMetricsCharts({
  sandboxId,
}: SandboxMetricsChartsProps) {
  const {
    metrics,
    timeframe,
    isLiveUpdating,
    isRefetching,
    setTimeframe,
    setLiveUpdating,
    lifecycleBounds,
  } = useSandboxMonitoringController(sandboxId)
  const [hoveredTimestampMs, setHoveredTimestampMs] = useState<number | null>(
    null
  )
  const [renderedTimeframe, setRenderedTimeframe] = useState(() => ({
    start: timeframe.start,
    end: timeframe.end,
  }))

  const handleTimeRangeChange = useCallback(
    (
      startTimestamp: number,
      endTimestamp: number,
      options?: { isLiveUpdating?: boolean }
    ) => {
      const nextLiveUpdating = options?.isLiveUpdating ?? false

      if (
        startTimestamp === timeframe.start &&
        endTimestamp === timeframe.end &&
        nextLiveUpdating === isLiveUpdating
      ) {
        return
      }

      setHoveredTimestampMs(null)
      setTimeframe(startTimestamp, endTimestamp, {
        isLiveUpdating: nextLiveUpdating,
      })
    },
    [isLiveUpdating, setTimeframe, timeframe.end, timeframe.start]
  )

  const chartModel = useMemo(
    () =>
      buildMonitoringChartModel({
        metrics,
        startMs: renderedTimeframe.start,
        endMs: renderedTimeframe.end,
        hoveredTimestampMs,
      }),
    [
      hoveredTimestampMs,
      metrics,
      renderedTimeframe.end,
      renderedTimeframe.start,
    ]
  )

  useEffect(() => {
    if (isRefetching) {
      return
    }

    setRenderedTimeframe((previous) => {
      if (
        previous.start === timeframe.start &&
        previous.end === timeframe.end
      ) {
        return previous
      }

      return {
        start: timeframe.start,
        end: timeframe.end,
      }
    })
  }, [isRefetching, timeframe.end, timeframe.start])

  const handleHoverEnd = useCallback(() => {
    setHoveredTimestampMs(null)
  }, [])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      {lifecycleBounds ? (
        <div className="flex items-center justify-start">
          <SandboxMonitoringTimeRangeControls
            timeframe={timeframe}
            lifecycle={lifecycleBounds}
            isLiveUpdating={isLiveUpdating}
            onLiveChange={setLiveUpdating}
            onTimeRangeChange={handleTimeRangeChange}
          />
        </div>
      ) : null}

      <MonitoringChartSection
        className="min-h-[280px] flex-[2]"
        header={
          <ResourceChartHeader
            metric={chartModel.latestMetric}
            hovered={chartModel.resourceHoveredContext}
          />
        }
      >
        <SandboxMetricsChart
          series={chartModel.resourceSeries}
          showXAxisLabels={false}
          yAxisMax={SANDBOX_MONITORING_PERCENT_MAX}
          className={cn(
            'h-full w-full transition-opacity duration-200',
            isRefetching ? 'opacity-60 pointer-events-none' : 'opacity-100'
          )}
          onHover={setHoveredTimestampMs}
          onHoverEnd={handleHoverEnd}
          onBrushEnd={handleTimeRangeChange}
        />
      </MonitoringChartSection>

      <MonitoringChartSection
        className="min-h-[280px] flex-1"
        header={
          <DiskChartHeader
            metric={chartModel.latestMetric}
            hovered={chartModel.diskHoveredContext}
          />
        }
      >
        <SandboxMetricsChart
          series={chartModel.diskSeries}
          showArea
          showXAxisLabels
          yAxisMax={SANDBOX_MONITORING_PERCENT_MAX}
          className={cn(
            'h-full w-full transition-opacity duration-200',
            isRefetching ? 'opacity-60 pointer-events-none' : 'opacity-100'
          )}
          onHover={setHoveredTimestampMs}
          onHoverEnd={handleHoverEnd}
          onBrushEnd={handleTimeRangeChange}
        />
      </MonitoringChartSection>
    </div>
  )
}
