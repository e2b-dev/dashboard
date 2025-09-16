/**
 * Series configuration builders for line charts
 */

import { formatAxisNumber } from '@/lib/utils/formatting'
import { EChartsOption } from 'echarts'
import {
  EMPHASIS_SYMBOL_SIZE,
  LIMIT_LINE_OPACITY,
  LIMIT_LINE_WIDTH,
  LIMIT_LINE_Z_INDEX,
  LIVE_DATA_THRESHOLD_MS,
  LIVE_INDICATOR_MIDDLE_OPACITY,
  LIVE_INDICATOR_OUTER_OPACITY,
  LIVE_INDICATOR_SIZES,
} from './constants'
import type { CssVars, LineSeries } from './types'
import { makeSeriesFromData } from './utils'

/**
 * Check if data series is "live" (last point less than 2 min old)
 */
export function isLiveData(seriesData: LineSeries): boolean {
  if (!seriesData.data.length) return false
  const lastPoint = seriesData.data[seriesData.data.length - 1]
  if (!lastPoint) return false

  const lastTimestamp =
    lastPoint.x instanceof Date
      ? lastPoint.x.getTime()
      : typeof lastPoint.x === 'number'
        ? lastPoint.x
        : new Date(lastPoint.x).getTime()

  const now = Date.now()
  return lastTimestamp > now - LIVE_DATA_THRESHOLD_MS && lastTimestamp <= now
}

/**
 * Create limit line configuration
 */
export function createLimitLineConfig(yAxisLimit: number, cssVars: CssVars) {
  return {
    markLine: {
      symbol: 'none',
      label: {
        show: true,
        fontFamily: cssVars['--font-mono'],
      },
      lineStyle: {
        type: 'solid' as const,
        width: 1,
      },
      z: LIMIT_LINE_Z_INDEX,
      emphasis: {
        disabled: true,
        tooltip: {
          show: false,
        },
      },
      data: [
        {
          yAxis: yAxisLimit,
          name: 'Limit',
          label: {
            formatter: `${formatAxisNumber(yAxisLimit)}`,
            position: 'start' as const,
            backgroundColor: cssVars['--bg-1'],
            color: cssVars['--accent-error-highlight'],
            fontFamily: cssVars['--font-mono'],
            borderRadius: 0,
            padding: [4, 4],
            style: {
              borderWidth: 0,
              borderColor: cssVars['--accent-error-highlight'],
              backgroundColor: cssVars['--accent-error-bg'],
            },
          },
          lineStyle: {
            color: cssVars['--accent-error-highlight'],
            opacity: LIMIT_LINE_OPACITY,
            type: 'dashed' as const,
            width: LIMIT_LINE_WIDTH,
          },
        },
      ],
    },
  }
}

/**
 * Add live indicators to series data
 */
export function addLiveIndicators(
  series: EChartsOption['series'],
  originalData: LineSeries[],
  cssVars: CssVars,
  showTooltip: boolean
) {
  if (!Array.isArray(series)) return series

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return series.map((s: any, idx: number) => {
    const data = originalData[idx]
    if (!data || !isLiveData(data)) return s

    const lastPoint = data.data[data.data.length - 1]
    if (!lastPoint) return s

    // add markPoint for live indicator
    const lineColor =
      s.lineStyle?.color || cssVars['--accent-positive-highlight']

    return {
      ...s,
      markPoint: {
        silent: true,
        animation: false,
        data: [
          // outer pulsing ring
          {
            coord: [
              lastPoint.x instanceof Date ? lastPoint.x.getTime() : lastPoint.x,
              lastPoint.y,
            ],
            symbol: 'circle',
            symbolSize: LIVE_INDICATOR_SIZES.outer,
            itemStyle: {
              color: 'transparent',
              borderColor: lineColor,
              borderWidth: 1,
              shadowBlur: 8,
              shadowColor: lineColor,
              opacity: LIVE_INDICATOR_OUTER_OPACITY,
            },
            emphasis: {
              disabled: true,
            },
            label: {
              show: false,
            },
          },
          // middle ring
          {
            coord: [
              lastPoint.x instanceof Date ? lastPoint.x.getTime() : lastPoint.x,
              lastPoint.y,
            ],
            symbol: 'circle',
            symbolSize: LIVE_INDICATOR_SIZES.middle,
            itemStyle: {
              color: lineColor,
              opacity: LIVE_INDICATOR_MIDDLE_OPACITY,
              borderWidth: 0,
            },
            emphasis: {
              disabled: true,
            },
            label: {
              show: false,
            },
          },
          // inner solid dot
          {
            coord: [
              lastPoint.x instanceof Date ? lastPoint.x.getTime() : lastPoint.x,
              lastPoint.y,
            ],
            symbol: 'circle',
            symbolSize: LIVE_INDICATOR_SIZES.inner,
            itemStyle: {
              color: lineColor,
              borderWidth: 0,
              shadowBlur: 4,
              shadowColor: lineColor,
            },
            emphasis: {
              disabled: true,
            },
            label: {
              show: false,
            },
          },
        ],
      },
      showSymbol: false,
      // show symbol on hover when tooltip is enabled
      emphasis: showTooltip
        ? {
            focus: 'series',
            itemStyle: {
              borderWidth: 2,
              borderColor: lineColor,
            },
            scale: true,
            symbolSize: EMPHASIS_SYMBOL_SIZE,
          }
        : undefined,
    }
  })
}

/**
 * Build complete series configuration with all enhancements
 */
export function buildSeriesWithEnhancements(
  data: LineSeries[],
  cssVars: CssVars,
  showTooltip: boolean,
  yAxisLimit?: number
): EChartsOption['series'] {
  // start with base series from data
  let series = makeSeriesFromData(data, cssVars, showTooltip)

  // add live indicators
  series = addLiveIndicators(series, data, cssVars, showTooltip)

  // add limit line to first series if specified
  if (yAxisLimit !== undefined && Array.isArray(series) && series.length > 0) {
    const limitLineConfig = createLimitLineConfig(yAxisLimit, cssVars)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    series[0] = { ...series[0], ...limitLineConfig } as any
  }

  return series
}
