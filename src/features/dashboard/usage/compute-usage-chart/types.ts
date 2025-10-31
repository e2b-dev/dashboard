import { ComputUsageAxisPoint, SamplingMode } from '../types'

export type ComputeChartType = 'cost' | 'ram' | 'vcpu' | 'sandboxes'

export interface ComputeUsageChartProps {
  startTime?: number
  endTime?: number
  type: ComputeChartType
  data: ComputUsageAxisPoint[]
  samplingMode: SamplingMode
  className?: string
  onHover?: (index: number) => void
  onHoverEnd?: () => void
  onBrushEnd?: (startIndex: number, endIndex: number) => void
}

export interface ComputeDataPoint {
  x: number // timestamp
  y: number // value
  label: string // formatted label for display
}

export interface ComputeChartConfig {
  id: string
  name: string
  valueKey: 'total_cost' | 'ram_gb_hours' | 'vcpu_hours' | 'count'
  barColorVar: string
  areaFromVar: string
  areaToVar: string
  yAxisScaleFactor: number
  yAxisFormatter: (value: number) => string
}
