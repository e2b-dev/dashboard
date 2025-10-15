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

// echarts static configuration that never changes
export const STATIC_ECHARTS_CONFIG = {
  backgroundColor: 'transparent',
  animation: false,
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

export const LIVE_PADDING_MULTIPLIER = 1
