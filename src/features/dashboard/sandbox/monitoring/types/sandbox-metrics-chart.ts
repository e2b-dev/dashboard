import type { ReactNode } from 'react'
import type { SandboxMetric } from '@/server/api/models/sandboxes.models'

export type SandboxMetricsDataPoint = [
  timestampMs: number,
  value: number | null,
  markerValue?: number | null,
]

export interface SandboxMetricsMarkerValueFormatterInput {
  value: number
  markerValue: number | null
  point: SandboxMetricsDataPoint
}

export interface SandboxMetricsSeries {
  id: string
  name: string
  data: SandboxMetricsDataPoint[]
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

export interface SandboxMetricsChartProps {
  series: SandboxMetricsSeries[]
  hoveredTimestampMs?: number | null
  className?: string
  stacked?: boolean
  showArea?: boolean
  showCrosshairBadges?: boolean
  showXAxisLabels?: boolean
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
  resourceHoveredContext: MonitoringResourceHoveredContext | null
  diskHoveredContext: MonitoringDiskHoveredContext | null
}
