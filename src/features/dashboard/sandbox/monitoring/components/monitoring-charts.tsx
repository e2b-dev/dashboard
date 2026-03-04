'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import { CpuIcon, MemoryIcon, StorageIcon } from '@/ui/primitives/icons'
import { useSandboxMonitoringController } from '../state/use-sandbox-monitoring-controller'
import type { SandboxMetricsMarkerValueFormatterInput } from '../types/sandbox-metrics-chart'
import { buildMonitoringChartModel } from '../utils/chart-model'
import {
  SANDBOX_MONITORING_CPU_SERIES_ID,
  SANDBOX_MONITORING_DISK_SERIES_ID,
  SANDBOX_MONITORING_PERCENT_MAX,
  SANDBOX_MONITORING_RAM_SERIES_ID,
} from '../utils/constants'
import MonitoringChartSection from './monitoring-chart-section'
import DiskChartHeader from './monitoring-disk-chart-header'
import ResourceChartHeader from './monitoring-resource-chart-header'
import SandboxMetricsChart from './monitoring-sandbox-metrics-chart'
import SandboxMonitoringTimeRangeControls from './monitoring-time-range-controls'

interface SandboxMetricsChartsProps {
  sandboxId: string
}

function formatMarkerPercent(value: number) {
  return Math.round(value)
}

function renderPercentMarker(value: number) {
  return (
    <>
      <span className="text-fg">{formatMarkerPercent(value)}</span>
      <span className="text-fg-secondary">%</span>
    </>
  )
}

function renderUsageMarker(usedMb: number | null, value: number) {
  const normalizedUsedMb =
    usedMb === null || !Number.isFinite(usedMb) ? 0 : Math.round(usedMb)

  return (
    <>
      <span className="text-fg">{normalizedUsedMb.toLocaleString()}</span>
      <span className="text-fg-secondary">MB</span>
      <span className="text-fg-tertiary px-0.75">·</span>
      <span className="text-fg">{formatMarkerPercent(value)}</span>
      <span className="text-fg-secondary">%</span>
    </>
  )
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
  const resourceSeriesWithMarkerFormatters = useMemo(
    () =>
      chartModel.resourceSeries.map((line) => {
        if (line.id === SANDBOX_MONITORING_CPU_SERIES_ID) {
          return {
            ...line,
            markerValueFormatter: ({
              value,
            }: SandboxMetricsMarkerValueFormatterInput) => (
              <div className="flex items-center">
                {renderPercentMarker(value)}
                <CpuIcon className="size-3.5 ml-2 text-fg-tertiary" />
              </div>
            ),
          }
        }

        if (line.id === SANDBOX_MONITORING_RAM_SERIES_ID) {
          return {
            ...line,
            markerValueFormatter: ({
              markerValue,
              value,
            }: SandboxMetricsMarkerValueFormatterInput) => (
              <div className="flex items-center">
                {renderUsageMarker(markerValue, value)}
                <MemoryIcon className="size-3.5 ml-2 text-fg-tertiary" />
              </div>
            ),
          }
        }

        return line
      }),
    [chartModel.resourceSeries]
  )
  const diskSeriesWithMarkerFormatters = useMemo(
    () =>
      chartModel.diskSeries.map((line) => {
        if (line.id !== SANDBOX_MONITORING_DISK_SERIES_ID) {
          return line
        }

        return {
          ...line,
          markerValueFormatter: ({
            markerValue,
            value,
          }: SandboxMetricsMarkerValueFormatterInput) => (
            <div className="flex items-center">
              {renderUsageMarker(markerValue, value)}
              <StorageIcon className="size-3.5 ml-2 text-fg-tertiary" />
            </div>
          ),
        }
      }),
    [chartModel.diskSeries]
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
    <div className="flex min-h-0 flex-1 flex-col">
      {lifecycleBounds ? (
        <div className="flex items-center justify-start pb-3 md:pb-6">
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
        className="flex-1"
        header={
          <ResourceChartHeader
            metric={chartModel.latestMetric}
            hovered={chartModel.resourceHoveredContext}
          />
        }
      >
        <SandboxMetricsChart
          series={resourceSeriesWithMarkerFormatters}
          hoveredTimestampMs={hoveredTimestampMs}
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
        className="flex-1"
        header={
          <DiskChartHeader
            metric={chartModel.latestMetric}
            hovered={chartModel.diskHoveredContext}
          />
        }
      >
        <SandboxMetricsChart
          series={diskSeriesWithMarkerFormatters}
          hoveredTimestampMs={hoveredTimestampMs}
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
