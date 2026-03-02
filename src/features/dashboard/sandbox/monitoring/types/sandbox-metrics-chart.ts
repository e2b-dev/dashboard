import type { SandboxMetric } from '@/server/api/models/sandboxes.models'

export type SandboxMetricsDataPoint = {
  x: number
  y: number | null
}

export interface SandboxMetricsSeries {
  id: string
  name: string
  data: SandboxMetricsDataPoint[]
  lineColorVar?: string
  areaColorVar?: string
  areaToColorVar?: string
}

export interface SandboxMetricsChartProps {
  categories: number[]
  series: SandboxMetricsSeries[]
  className?: string
  stacked?: boolean
  showArea?: boolean
  showXAxisLabels?: boolean
  yAxisMax?: number
  yAxisFormatter?: (value: number) => string
  onHover?: (index: number) => void
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
  categories: number[]
  latestMetric: SandboxMetric | undefined
  resourceSeries: SandboxMetricsSeries[]
  diskSeries: SandboxMetricsSeries[]
  resourceHoveredContext: MonitoringResourceHoveredContext | null
  diskHoveredContext: MonitoringDiskHoveredContext | null
}
