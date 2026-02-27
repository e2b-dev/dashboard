'use client'

import { useSandboxContext } from '@/features/dashboard/sandbox/context'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSandboxMonitoringController } from '../state/use-sandbox-monitoring-controller'
import {
  SANDBOX_MONITORING_CPU_SERIES_ID,
  SANDBOX_MONITORING_DISK_SERIES_ID,
  SANDBOX_MONITORING_PERCENT_MAX,
  SANDBOX_MONITORING_RAM_SERIES_ID,
} from '../utils/constants'
import {
  buildDiskSeries,
  buildResourceSeries,
  buildTimelineCategories,
  filterSandboxMetricsByTimeRange,
  sortSandboxMetricsByTime,
} from '../utils/metrics'
import {
  clampTimeframeToBounds,
  getSandboxLifecycleBounds,
} from '../utils/timeframe'
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
  } = useSandboxMonitoringController(sandboxId)
  const { sandboxInfo } = useSandboxContext()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const lifecycleBounds = useMemo(() => {
    if (!sandboxInfo) return null
    return getSandboxLifecycleBounds(sandboxInfo)
  }, [sandboxInfo])

  const applyTimeframe = useCallback(
    (
      startTimestamp: number,
      endTimestamp: number,
      options?: { isLiveUpdating?: boolean }
    ) => {
      const maxBoundMs =
        lifecycleBounds && lifecycleBounds.isRunning
          ? Date.now()
          : lifecycleBounds?.anchorEndMs
      const next = lifecycleBounds
        ? clampTimeframeToBounds(
            startTimestamp,
            endTimestamp,
            lifecycleBounds.startMs,
            maxBoundMs ?? lifecycleBounds.anchorEndMs
          )
        : { start: startTimestamp, end: endTimestamp }
      const nextLiveUpdating = options?.isLiveUpdating ?? false

      if (
        next.start === timeframe.start &&
        next.end === timeframe.end &&
        nextLiveUpdating === isLiveUpdating
      ) {
        return
      }

      setHoveredIndex(null)
      setTimeframe(next.start, next.end, {
        isLiveUpdating: nextLiveUpdating,
      })
    },
    [
      isLiveUpdating,
      lifecycleBounds,
      setTimeframe,
      timeframe.end,
      timeframe.start,
    ]
  )

  useEffect(() => {
    if (!lifecycleBounds) return

    const maxBoundMs = lifecycleBounds.isRunning
      ? Date.now()
      : lifecycleBounds.anchorEndMs
    const next = clampTimeframeToBounds(
      timeframe.start,
      timeframe.end,
      lifecycleBounds.startMs,
      maxBoundMs
    )

    if (next.start === timeframe.start && next.end === timeframe.end) {
      return
    }

    setTimeframe(next.start, next.end, {
      isLiveUpdating,
    })
  }, [
    isLiveUpdating,
    lifecycleBounds,
    setTimeframe,
    timeframe.end,
    timeframe.start,
  ])

  useEffect(() => {
    if (!lifecycleBounds?.isRunning && isLiveUpdating) {
      setLiveUpdating(false)
    }
  }, [isLiveUpdating, lifecycleBounds?.isRunning, setLiveUpdating])

  const constrainedMetrics = useMemo(
    () =>
      filterSandboxMetricsByTimeRange(metrics, timeframe.start, timeframe.end),
    [metrics, timeframe.end, timeframe.start]
  )
  const sortedMetrics = useMemo(
    () => sortSandboxMetricsByTime(constrainedMetrics),
    [constrainedMetrics]
  )
  const categories = useMemo(
    () => buildTimelineCategories(timeframe.start, timeframe.end),
    [timeframe.end, timeframe.start]
  )

  const resourceSeries = useMemo(
    () => buildResourceSeries(sortedMetrics, categories),
    [categories, sortedMetrics]
  )
  const diskSeries = useMemo(
    () => buildDiskSeries(sortedMetrics, categories),
    [categories, sortedMetrics]
  )
  const latestMetric = constrainedMetrics[constrainedMetrics.length - 1]
  const hoveredTimestamp =
    hoveredIndex !== null ? categories[hoveredIndex] : undefined
  const hoveredCpuPercent =
    hoveredIndex === null
      ? null
      : (resourceSeries.find(
          (item) => item.id === SANDBOX_MONITORING_CPU_SERIES_ID
        )?.data[hoveredIndex]?.y ?? null)
  const hoveredRamPercent =
    hoveredIndex === null
      ? null
      : (resourceSeries.find(
          (item) => item.id === SANDBOX_MONITORING_RAM_SERIES_ID
        )?.data[hoveredIndex]?.y ?? null)
  const hoveredDiskPercent =
    hoveredIndex === null
      ? null
      : (diskSeries.find(
          (item) => item.id === SANDBOX_MONITORING_DISK_SERIES_ID
        )?.data[hoveredIndex]?.y ?? null)

  const resourceHoveredContext =
    hoveredTimestamp !== undefined
      ? {
          cpuPercent: hoveredCpuPercent,
          ramPercent: hoveredRamPercent,
          timestampMs: hoveredTimestamp,
        }
      : null
  const diskHoveredContext =
    hoveredTimestamp !== undefined
      ? {
          diskPercent: hoveredDiskPercent,
          timestampMs: hoveredTimestamp,
        }
      : null
  const handleHoverEnd = useCallback(() => {
    setHoveredIndex(null)
  }, [])

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <MonitoringChartSection
        className="min-h-[280px] flex-[2]"
        header={
          <ResourceChartHeader
            metric={latestMetric}
            hovered={resourceHoveredContext}
            suffix={
              lifecycleBounds ? (
                <SandboxMonitoringTimeRangeControls
                  timeframe={timeframe}
                  lifecycle={lifecycleBounds}
                  isLiveUpdating={isLiveUpdating}
                  onLiveChange={setLiveUpdating}
                  onTimeRangeChange={applyTimeframe}
                />
              ) : null
            }
          />
        }
      >
        <SandboxMetricsChart
          categories={categories}
          series={resourceSeries}
          stacked
          showXAxisLabels={false}
          yAxisMax={SANDBOX_MONITORING_PERCENT_MAX}
          className="h-full w-full"
          onHover={setHoveredIndex}
          onHoverEnd={handleHoverEnd}
          onBrushEnd={applyTimeframe}
        />
      </MonitoringChartSection>

      <MonitoringChartSection
        className="min-h-[280px] flex-1"
        header={
          <DiskChartHeader metric={latestMetric} hovered={diskHoveredContext} />
        }
      >
        <SandboxMetricsChart
          categories={categories}
          series={diskSeries}
          showArea
          showXAxisLabels
          yAxisMax={SANDBOX_MONITORING_PERCENT_MAX}
          className="h-full w-full"
          onHover={setHoveredIndex}
          onHoverEnd={handleHoverEnd}
          onBrushEnd={applyTimeframe}
        />
      </MonitoringChartSection>
    </div>
  )
}
