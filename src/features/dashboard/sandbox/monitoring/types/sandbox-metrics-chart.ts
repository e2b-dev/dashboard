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
