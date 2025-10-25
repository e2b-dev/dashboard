import { TimeSeriesPoint } from '@/lib/utils/time-series'

export type ComputeChartType = 'cost' | 'ram' | 'vcpu' | 'sandboxes'

export interface ComputeUsageChartProps {
  type: ComputeChartType
  data: TimeSeriesPoint[]
  className?: string
  onTooltipValueChange?: (timestamp: number) => void
  onHoverEnd?: () => void
  onBrushEnd?: (startTimestamp: number, endTimestamp: number) => void
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
