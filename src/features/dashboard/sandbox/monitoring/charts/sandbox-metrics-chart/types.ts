export type SandboxMetricsDataPoint = {
  x: number // timestamp
  y: number | null // value
}

export interface SandboxMetricsSeries {
  id: string
  name: string
  data: SandboxMetricsDataPoint[]
  lineColorVar?: string
  areaColorVar?: string
}

export interface SandboxMetricsChartProps {
  categories: number[]
  series: SandboxMetricsSeries[]
  className?: string
  stacked?: boolean
  showXAxisLabels?: boolean
  xAxisMin?: number
  xAxisMax?: number
  yAxisMax?: number
  yAxisFormatter?: (value: number) => string
  onHover?: (index: number) => void
  onHoverEnd?: () => void
  onBrushEnd?: (startTimestamp: number, endTimestamp: number) => void
}
