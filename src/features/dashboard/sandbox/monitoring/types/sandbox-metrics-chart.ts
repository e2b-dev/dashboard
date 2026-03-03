import type { SandboxMetric } from '@/server/api/models/sandboxes.models'

export type SandboxMetricsDataPoint = [
  timestampMs: number,
  value: number | null,
]

export interface SandboxMetricsSeries {
  id: string
  name: string
  data: SandboxMetricsDataPoint[]
  lineColorVar?: string
  areaColorVar?: string
  areaToColorVar?: string
  showArea?: boolean
  zIndex?: number
}

export interface SandboxMetricsChartProps {
  series: SandboxMetricsSeries[]
  className?: string
  stacked?: boolean
  showArea?: boolean
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
