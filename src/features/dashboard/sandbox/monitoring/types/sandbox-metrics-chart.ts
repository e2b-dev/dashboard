import type { ReactNode } from 'react'

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
  isPolling?: boolean
  isMobile?: boolean
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

export interface MonitoringChartModel {
  resourceSeries: SandboxMetricsSeries[]
  diskSeries: SandboxMetricsSeries[]
  resourceLifecycleEventMarkers: SandboxMetricsLifecycleEventMarker[]
}
