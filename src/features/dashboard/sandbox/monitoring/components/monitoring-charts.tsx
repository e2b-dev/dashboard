'use client'

import { useCallback, useMemo, useState } from 'react'
import { useSandboxMonitoringController } from '../state/use-sandbox-monitoring-controller'
import { SANDBOX_MONITORING_PERCENT_MAX } from '../utils/constants'
import { buildMonitoringChartModel } from '../utils/chart-model'
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
    setTimeframe,
    setLiveUpdating,
    lifecycleBounds,
  } = useSandboxMonitoringController(sandboxId)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

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

      setHoveredIndex(null)
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
        startMs: timeframe.start,
        endMs: timeframe.end,
        hoveredIndex,
      }),
    [hoveredIndex, metrics, timeframe.end, timeframe.start]
  )

  const handleHoverEnd = useCallback(() => {
    setHoveredIndex(null)
  }, [])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <MonitoringChartSection
        className="min-h-[280px] flex-[2]"
        header={
          <ResourceChartHeader
            metric={chartModel.latestMetric}
            hovered={chartModel.resourceHoveredContext}
            suffix={
              lifecycleBounds ? (
                <SandboxMonitoringTimeRangeControls
                  timeframe={timeframe}
                  lifecycle={lifecycleBounds}
                  isLiveUpdating={isLiveUpdating}
                  onLiveChange={setLiveUpdating}
                  onTimeRangeChange={handleTimeRangeChange}
                />
              ) : null
            }
          />
        }
      >
        <SandboxMetricsChart
          categories={chartModel.categories}
          series={chartModel.resourceSeries}
          stacked
          showXAxisLabels={false}
          yAxisMax={SANDBOX_MONITORING_PERCENT_MAX}
          className="h-full w-full"
          onHover={setHoveredIndex}
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
          categories={chartModel.categories}
          series={chartModel.diskSeries}
          showArea
          showXAxisLabels
          yAxisMax={SANDBOX_MONITORING_PERCENT_MAX}
          className="h-full w-full"
          onHover={setHoveredIndex}
          onHoverEnd={handleHoverEnd}
          onBrushEnd={handleTimeRangeChange}
        />
      </MonitoringChartSection>
    </div>
  )
}
