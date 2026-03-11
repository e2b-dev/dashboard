'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useIsMobile } from '@/lib/hooks/use-mobile'
import { cn } from '@/lib/utils'
import { CpuIcon, MemoryIcon, StorageIcon } from '@/ui/primitives/icons'
import { Separator } from '@/ui/primitives/separator'
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
import DiskChartFooter from './monitoring-disk-chart-footer'
import ResourceChartFooter from './monitoring-resource-chart-footer'
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
  presetId: string | null
}

function useChartZoom(options: {
  timeframe: { start: number; end: number }
  activePresetId: string | null
  setPreset: (presetId: string) => void
  setCustomTimeframe: (start: number, end: number) => void
  setHoveredTimestampMs: (value: number | null) => void
}) {
  const {
    timeframe,
    activePresetId,
    setPreset,
    setCustomTimeframe,
    setHoveredTimestampMs,
  } = options
  const [zoomResetSnapshot, setZoomResetSnapshot] =
    useState<ZoomResetSnapshot | null>(null)

  const clearZoomSnapshot = useCallback(() => {
    setZoomResetSnapshot(null)
  }, [])

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
          presetId: activePresetId,
        }
      })
      setHoveredTimestampMs(null)
      setCustomTimeframe(startTimestamp, endTimestamp)
    },
    [
      activePresetId,
      setCustomTimeframe,
      setHoveredTimestampMs,
      timeframe.end,
      timeframe.start,
    ]
  )

  const handleResetZoom = useCallback(() => {
    if (!zoomResetSnapshot) {
      return
    }

    setHoveredTimestampMs(null)
    if (zoomResetSnapshot.presetId !== null) {
      setPreset(zoomResetSnapshot.presetId)
    } else {
      setCustomTimeframe(zoomResetSnapshot.start, zoomResetSnapshot.end)
    }
    setZoomResetSnapshot(null)
  }, [setCustomTimeframe, setHoveredTimestampMs, setPreset, zoomResetSnapshot])

  return {
    canResetZoom: zoomResetSnapshot !== null,
    clearZoomSnapshot,
    handleBrushTimeRangeChange,
    handleResetZoom,
  }
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

const RESOURCE_CHART_GRID_MD = { top: 36, bottom: 36, left: 64, right: 64 }
const RESOURCE_CHART_GRID_SM = { top: 24, bottom: 36, left: 48, right: 42 }
const DISK_CHART_GRID_MD = { top: 36, bottom: 36, left: 64, right: 64 }
const DISK_CHART_GRID_SM = { top: 24, bottom: 36, left: 48, right: 42 }

export default function SandboxMetricsCharts({
  sandboxId,
}: SandboxMetricsChartsProps) {
  const isMobile = useIsMobile()
  const {
    metrics,
    timeframe,
    isLiveUpdating,
    isRefetching,
    activePresetId,
    setPreset,
    setCustomTimeframe,
    lifecycleBounds,
    lifecycleEvents,
  } = useSandboxMonitoringController(sandboxId)
  const [hoveredTimestampMs, setHoveredTimestampMs] = useState<number | null>(
    null
  )
  const [renderedTimeframe, setRenderedTimeframe] = useState(() => ({
    start: timeframe.start,
    end: timeframe.end,
  }))

  const {
    canResetZoom,
    clearZoomSnapshot,
    handleBrushTimeRangeChange,
    handleResetZoom,
  } = useChartZoom({
    timeframe,
    activePresetId,
    setPreset,
    setCustomTimeframe,
    setHoveredTimestampMs,
  })

  const chartModel = useMemo(
    () =>
      buildMonitoringChartModel({
        metrics,
        lifecycleEvents,
        startMs: renderedTimeframe.start,
        endMs: renderedTimeframe.end,
      }),
    [lifecycleEvents, metrics, renderedTimeframe.end, renderedTimeframe.start]
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

  const handlePresetSelect = useCallback(
    (id: string) => {
      clearZoomSnapshot()
      setHoveredTimestampMs(null)
      setPreset(id)
    },
    [clearZoomSnapshot, setPreset]
  )

  const handleCustomTimeRange = useCallback(
    (start: number, end: number) => {
      clearZoomSnapshot()
      setHoveredTimestampMs(null)
      setCustomTimeframe(start, end)
    },
    [clearZoomSnapshot, setCustomTimeframe]
  )

  const resourceChartGrid = isMobile
    ? RESOURCE_CHART_GRID_SM
    : RESOURCE_CHART_GRID_MD
  const diskChartGrid = isMobile ? DISK_CHART_GRID_SM : DISK_CHART_GRID_MD

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {lifecycleBounds ? (
        <div className="flex w-full items-center p-3 md:p-6 pb-0!">
          <SandboxMonitoringTimeRangeControls
            timeframe={timeframe}
            lifecycle={lifecycleBounds}
            isLiveUpdating={isLiveUpdating}
            activePresetId={activePresetId}
            onPresetSelect={handlePresetSelect}
            onCustomTimeRange={handleCustomTimeRange}
            canResetZoom={canResetZoom}
            onResetZoom={handleResetZoom}
          />
        </div>
      ) : null}

      <MonitoringChartSection
        className="flex-1"
        footer={<ResourceChartFooter />}
      >
        <SandboxMetricsChart
          series={resourceSeriesWithMarkerFormatters}
          lifecycleEventMarkers={chartModel.resourceLifecycleEventMarkers}
          isLiveUpdating={isLiveUpdating}
          isMobile={isMobile}
          hoveredTimestampMs={hoveredTimestampMs}
          showXAxisLabels
          grid={resourceChartGrid}
          xAxisMin={renderedTimeframe.start}
          xAxisMax={renderedTimeframe.end}
          yAxisMax={SANDBOX_MONITORING_PERCENT_MAX}
          yAxisFormatter={formatPercentAxisLabel}
          className={cn(
            'h-full w-full transition-opacity duration-200',
            isRefetching && !isLiveUpdating
              ? 'opacity-60 pointer-events-none'
              : 'opacity-100'
          )}
          onHover={setHoveredTimestampMs}
          onHoverEnd={handleHoverEnd}
          onBrushEnd={handleBrushTimeRangeChange}
        />
      </MonitoringChartSection>

      <Separator />

      <MonitoringChartSection
        className="flex-[0.8]"
        footer={<DiskChartFooter />}
      >
        <SandboxMetricsChart
          series={diskSeriesWithMarkerFormatters}
          lifecycleEventMarkers={chartModel.resourceLifecycleEventMarkers}
          showEventLabels={false}
          isLiveUpdating={isLiveUpdating}
          isMobile={isMobile}
          hoveredTimestampMs={hoveredTimestampMs}
          showXAxisLabels
          grid={diskChartGrid}
          xAxisMin={renderedTimeframe.start}
          xAxisMax={renderedTimeframe.end}
          yAxisMax={SANDBOX_MONITORING_PERCENT_MAX}
          yAxisFormatter={formatPercentAxisLabel}
          className={cn(
            'h-full w-full transition-opacity duration-200',
            isRefetching && !isLiveUpdating
              ? 'opacity-60 pointer-events-none'
              : 'opacity-100'
          )}
          onHover={setHoveredTimestampMs}
          onHoverEnd={handleHoverEnd}
          onBrushEnd={handleBrushTimeRangeChange}
        />
      </MonitoringChartSection>
    </div>
  )
}
