import { ClientTeamMetric } from '@/types/sandboxes.types'

export type ChartType = 'concurrent' | 'start-rate'

export interface TeamMetricsChartProps {
  type: ChartType
  metrics: ClientTeamMetric[]
  step: number
  timeframe: {
    start: number
    end: number
    isLive: boolean
    duration: number
  }
  className?: string
  concurrentLimit?: number
  onZoomEnd?: (from: number, to: number) => void
  onTooltipValueChange?: (timestamp: number, value: number) => void
  onHoverEnd?: () => void
}

/**
 * Team metrics specific data point (timestamps always as numbers)
 * More restrictive than generic LinePoint type
 */
export interface TeamMetricDataPoint {
  x: number
  y: number
}

/**
 * Configuration for a specific team metrics chart type
 * Not related to ui/primitives/chart.tsx ChartConfig (which is for Recharts)
 */
export interface TeamMetricChartConfig {
  id: string
  name: string
  valueKey: 'concurrentSandboxes' | 'sandboxStartRate'
  lineColorVar: string
  areaFromVar: string
  areaToVar: string
  yAxisScaleFactor: number
}
