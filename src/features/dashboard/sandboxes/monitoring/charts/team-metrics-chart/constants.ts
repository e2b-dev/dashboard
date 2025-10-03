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
    centralTendency: 'average',
    lineColorVar: '--accent-positive-highlight',
    areaFromVar: '--graph-area-accent-positive-from',
    areaToVar: '--graph-area-accent-positive-to',
    tooltipLabel: (value: number) =>
      value === 1 ? 'concurrent sandbox' : 'concurrent sandboxes',
    tooltipValueClass: 'text-accent-positive-highlight',
    yAxisScaleFactor: 1.25,
  },
  'start-rate': {
    id: 'rate',
    name: 'Rate',
    valueKey: 'sandboxStartRate',
    centralTendency: 'median',
    lineColorVar: '--bg-inverted',
    areaFromVar: '--graph-area-fg-from',
    areaToVar: '--graph-area-fg-to',
    tooltipLabel: 'sandboxes/s',
    tooltipValueClass: 'text-fg',
    yAxisScaleFactor: 1.5,
  },
}

// echarts static configuration that never changes
export const STATIC_ECHARTS_CONFIG = {
  backgroundColor: 'transparent',
  animation: false, // disable animations for performance
  toolbox: {
    id: 'toolbox',
    show: true,
    iconStyle: { opacity: 0 },
    showTitle: false,
    feature: {
      dataZoom: {
        yAxisIndex: 'none',
      },
    },
  },
} as const

export const AXIS_SPLIT_NUMBER = 2
export const LIMIT_LINE_PADDING = 1.1
export const LIVE_PADDING_MULTIPLIER = 1
