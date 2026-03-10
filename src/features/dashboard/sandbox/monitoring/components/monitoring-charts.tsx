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

function formatPercentAxisLabel(value: number): string {
  return `${Math.round(value)}%`
}

interface SandboxMetricsChartsProps {
  sandboxId: string
}

interface ZoomResetSnapshot {
  start: number
  end: number
  isLiveUpdating: boolean
}

function renderPercentMarker(value: number) {
  return (
    <>
      <span className="text-fg">{Math.round(value)}</span>
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
      <span className="text-fg">{Math.round(value)}</span>
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
    lifecycleEvents,
  } = useSandboxMonitoringController(sandboxId)
  const [hoveredTimestampMs, setHoveredTimestampMs] = useState<number | null>(
    null
  )
  const [zoomResetSnapshot, setZoomResetSnapshot] =
    useState<ZoomResetSnapshot | null>(null)
  const [renderedTimeframe, setRenderedTimeframe] = useState(() => ({
    start: timeframe.start,
    end: timeframe.end,
  }))

  const handleControlTimeRangeChange = useCallback(
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

      setZoomResetSnapshot(null)
      setHoveredTimestampMs(null)
      setTimeframe(startTimestamp, endTimestamp, {
        isLiveUpdating: nextLiveUpdating,
      })
    },
    [isLiveUpdating, setTimeframe, timeframe.end, timeframe.start]
  )
  const handleBrushTimeRangeChange = useCallback(
    (startTimestamp: number, endTimestamp: number) => {
      if (
        startTimestamp === timeframe.start &&
        endTimestamp === timeframe.end
      ) {
        return
      }

      setZoomResetSnapshot((previous) => {
        if (previous) {
          return previous
        }

        return {
          start: timeframe.start,
          end: timeframe.end,
          isLiveUpdating,
        }
      })
      setHoveredTimestampMs(null)
      setTimeframe(startTimestamp, endTimestamp, {
        isLiveUpdating: false,
      })
    },
    [isLiveUpdating, setTimeframe, timeframe.end, timeframe.start]
  )
  const handleResetZoom = useCallback(() => {
    if (!zoomResetSnapshot) {
      return
    }

    setHoveredTimestampMs(null)
    setTimeframe(zoomResetSnapshot.start, zoomResetSnapshot.end, {
      isLiveUpdating: zoomResetSnapshot.isLiveUpdating,
    })
    setZoomResetSnapshot(null)
  }, [setTimeframe, zoomResetSnapshot])

  const chartModel = useMemo(
    () =>
      buildMonitoringChartModel({
        metrics,
        lifecycleEvents,
        startMs: renderedTimeframe.start,
        endMs: renderedTimeframe.end,
        hoveredTimestampMs,
      }),
    [
      hoveredTimestampMs,
      lifecycleEvents,
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
    <div className="flex min-h-0 flex-1 flex-col pt-3 md:pt-6">
      {lifecycleBounds ? (
        <div className="flex w-full items-center px-3 md:px-6 pb-3 md:pb-6">
          <SandboxMonitoringTimeRangeControls
            timeframe={timeframe}
            lifecycle={lifecycleBounds}
            isLiveUpdating={isLiveUpdating}
            onLiveChange={setLiveUpdating}
            onTimeRangeChange={handleControlTimeRangeChange}
            canResetZoom={zoomResetSnapshot !== null}
            onResetZoom={handleResetZoom}
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
          lifecycleEventMarkers={chartModel.resourceLifecycleEventMarkers}
          isLiveUpdating={isLiveUpdating}
          hoveredTimestampMs={hoveredTimestampMs}
          showXAxisLabels
          grid={{ top: 42, bottom: 42, left: 64, right: 42 }}
          xAxisMin={renderedTimeframe.start}
          xAxisMax={renderedTimeframe.end}
          yAxisMax={SANDBOX_MONITORING_PERCENT_MAX}
          yAxisFormatter={formatPercentAxisLabel}
          className={cn(
            'h-full w-full transition-opacity duration-200',
            isRefetching ? 'opacity-60 pointer-events-none' : 'opacity-100'
          )}
          onHover={setHoveredTimestampMs}
          onHoverEnd={handleHoverEnd}
          onBrushEnd={handleBrushTimeRangeChange}
        />
      </MonitoringChartSection>

      <MonitoringChartSection
        className="flex-[0.8]"
        header={
          <DiskChartHeader
            metric={chartModel.latestMetric}
            hovered={chartModel.diskHoveredContext}
          />
        }
      >
        <SandboxMetricsChart
          series={diskSeriesWithMarkerFormatters}
          lifecycleEventMarkers={chartModel.resourceLifecycleEventMarkers}
          showEventLabels={false}
          isLiveUpdating={isLiveUpdating}
          hoveredTimestampMs={hoveredTimestampMs}
          showXAxisLabels
          grid={{ top: 36, bottom: 40, left: 64, right: 42 }}
          xAxisMin={renderedTimeframe.start}
          xAxisMax={renderedTimeframe.end}
          yAxisMax={SANDBOX_MONITORING_PERCENT_MAX}
          yAxisFormatter={formatPercentAxisLabel}
          className={cn(
            'h-full w-full transition-opacity duration-200',
            isRefetching ? 'opacity-60 pointer-events-none' : 'opacity-100'
          )}
          onHover={setHoveredTimestampMs}
          onHoverEnd={handleHoverEnd}
          onBrushEnd={handleBrushTimeRangeChange}
        />
      </MonitoringChartSection>
    </div>
  )
}
