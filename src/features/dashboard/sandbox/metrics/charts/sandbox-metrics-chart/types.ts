export type SandboxMetricsDataPoint = {
  x: number // timestamp
  y: number // value
}

export type SandboxMetricsChartType = 'cpu' | 'ram' | 'disk'

export interface SandboxMetricsChartConfig {
  id: string
  lineColorVar: string
  yAxisScaleFactor: number
  yAxisFormatter: (value: number) => string
}

export interface SandboxMetricsChartProps {
  type: SandboxMetricsChartType
  data: SandboxMetricsDataPoint[]
  className?: string
  onBrushEnd?: (startIndex: number, endIndex: number) => void
}
