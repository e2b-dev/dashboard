'use client'

import { useMemo, useState } from 'react'
import { useSandboxMonitoringController } from '../hooks/use-sandbox-monitoring-controller'
import MonitoringChartSection from './chart-section'
import DiskChartHeader from './disk-chart-header'
import ResourceChartHeader from './resource-chart-header'
import SandboxMetricsChart from './sandbox-metrics-chart'
import {
  buildDiskSeries,
  buildResourceSeries,
  buildTimelineCategories,
  filterSandboxMetricsByTimeRange,
} from './utils'

interface SandboxMetricsChartsProps {
  sandboxId: string
}

export default function SandboxMetricsCharts({
  sandboxId,
}: SandboxMetricsChartsProps) {
  const { metrics, timeframe, setTimeframe } =
    useSandboxMonitoringController(sandboxId)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const constrainedMetrics = useMemo(
    () =>
      filterSandboxMetricsByTimeRange(metrics, timeframe.start, timeframe.end),
    [metrics, timeframe.end, timeframe.start]
  )
  const categories = useMemo(
    () => buildTimelineCategories(timeframe.start, timeframe.end),
    [timeframe.end, timeframe.start]
  )

  const resourceSeries = useMemo(
    () => buildResourceSeries(constrainedMetrics, categories),
    [categories, constrainedMetrics]
  )
  const diskSeries = useMemo(
    () => buildDiskSeries(constrainedMetrics, categories),
    [categories, constrainedMetrics]
  )
  const latestMetric = constrainedMetrics[constrainedMetrics.length - 1]
  const hoveredTimestamp =
    hoveredIndex !== null ? categories[hoveredIndex] : undefined
  const hoveredCpuPercent =
    hoveredIndex !== null
      ? (resourceSeries.find((item) => item.id === 'cpu')?.data[hoveredIndex]?.y ??
        null)
      : null
  const hoveredRamPercent =
    hoveredIndex !== null
      ? (resourceSeries.find((item) => item.id === 'ram')?.data[hoveredIndex]?.y ??
        null)
      : null
  const hoveredDiskPercent =
    hoveredIndex !== null
      ? (diskSeries.find((item) => item.id === 'disk')?.data[hoveredIndex]?.y ??
        null)
      : null

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

  const handleBrushEnd = (startTimestamp: number, endTimestamp: number) => {
    if (startTimestamp === timeframe.start && endTimestamp === timeframe.end) {
      return
    }

    setHoveredIndex(null)
    setTimeframe(startTimestamp, endTimestamp)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 max-h-[650px]">
      <MonitoringChartSection
        className="min-h-[280px] flex-[2]"
        header={
          <ResourceChartHeader
            metric={latestMetric}
            hovered={resourceHoveredContext}
          />
        }
      >
        <SandboxMetricsChart
          categories={categories}
          series={resourceSeries}
          stacked
          showXAxisLabels={false}
          xAxisMin={timeframe.start}
          xAxisMax={timeframe.end}
          yAxisMax={100}
          className="h-full w-full"
          onHover={setHoveredIndex}
          onHoverEnd={() => setHoveredIndex(null)}
          onBrushEnd={handleBrushEnd}
        />
      </MonitoringChartSection>

      <MonitoringChartSection
        className="min-h-[220px] flex-1"
        header={
          <DiskChartHeader metric={latestMetric} hovered={diskHoveredContext} />
        }
      >
        <SandboxMetricsChart
          categories={categories}
          series={diskSeries}
          showXAxisLabels
          xAxisMin={timeframe.start}
          xAxisMax={timeframe.end}
          yAxisMax={100}
          className="h-full w-full"
          onHover={setHoveredIndex}
          onHoverEnd={() => setHoveredIndex(null)}
          onBrushEnd={handleBrushEnd}
        />
      </MonitoringChartSection>
    </div>
  )
}
