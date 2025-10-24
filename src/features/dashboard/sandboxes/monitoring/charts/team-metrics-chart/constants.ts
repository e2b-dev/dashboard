import { ChartType, TeamMetricChartConfig } from './types'

/**
 * Static chart configurations by type
 * These never change and can be referenced directly
 */
export const CHART_CONFIGS: Record<ChartType, TeamMetricChartConfig> = {
  concurrent: {
    id: 'concurrent-sandboxes',
    name: 'Running Sandboxes',
    valueKey: 'concurrentSandboxes',
    lineColorVar: '--accent-positive-highlight',
    areaFromVar: '--graph-area-accent-positive-from',
    areaToVar: '--graph-area-accent-positive-to',
    yAxisScaleFactor: 1.75,
  },
  'start-rate': {
    id: 'rate',
    name: 'Rate',
    valueKey: 'sandboxStartRate',
    lineColorVar: '--bg-inverted',
    areaFromVar: '--graph-area-fg-from',
    areaToVar: '--graph-area-fg-to',
    yAxisScaleFactor: 1.75,
  },
}

export const LIVE_PADDING_MULTIPLIER = 1
