import type { ReactNode } from 'react'
import type { SandboxMetric } from '@/server/api/models/sandboxes.models'

export type SandboxMetricsDataPoint = [
  timestampMs: number,
  value: number | null,
  markerValue?: number | null,
]

export interface SandboxMetricsSeriesConnector {
  from: [timestampMs: number, value: number]
  to: [timestampMs: number, value: number]
}

export interface SandboxMetricsMarkerValueFormatterInput {
  value: number
  markerValue: number | null
  point: SandboxMetricsDataPoint
}

export interface SandboxMetricsSeries {
  id: string
  name: string
  data: SandboxMetricsDataPoint[]
  connectors?: SandboxMetricsSeriesConnector[]
  markerValueFormatter?: (
    input: SandboxMetricsMarkerValueFormatterInput
  ) => ReactNode
  lineColorVar?: string
  areaColorVar?: string
  areaToColorVar?: string
  showArea?: boolean
  areaOpacity?: number
  zIndex?: number
}

export interface SandboxMetricsLifecycleEventMarker {
  id: string
  type: string
  label: string
  timestampMs: number
  colorVar: string
}

export interface SandboxMetricsChartGridConfig {
  top?: number
  bottom?: number
  left?: number
  right?: number
}

export interface SandboxMetricsChartProps {
  series: SandboxMetricsSeries[]
  lifecycleEventMarkers?: SandboxMetricsLifecycleEventMarker[]
  showEventLabels?: boolean
  hoveredTimestampMs?: number | null
  className?: string
  showXAxisLabels?: boolean
  grid: SandboxMetricsChartGridConfig
  xAxisMin?: number
  xAxisMax?: number
  yAxisMax?: number
  yAxisFormatter?: (value: number) => string
  onHover?: (timestampMs: number) => void
  onHoverEnd?: () => void
  onBrushEnd?: (startTimestamp: number, endTimestamp: number) => void
}

export interface MonitoringResourceHoveredContext {
  cpuPercent: number | null
  ramPercent: number | null
  timestampMs: number
}

export interface MonitoringDiskHoveredContext {
  diskPercent: number | null
  timestampMs: number
}

export interface MonitoringChartModel {
  latestMetric: SandboxMetric | undefined
  resourceSeries: SandboxMetricsSeries[]
  diskSeries: SandboxMetricsSeries[]
  resourceLifecycleEventMarkers: SandboxMetricsLifecycleEventMarker[]
  resourceHoveredContext: MonitoringResourceHoveredContext | null
  diskHoveredContext: MonitoringDiskHoveredContext | null
}
