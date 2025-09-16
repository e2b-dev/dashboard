/**
 * Formatting utilities for line chart axes and tooltips
 */

import {
  formatAxisNumber,
  formatChartTimestampLocal,
  formatNumber,
  formatTimeAxisLabel,
} from '@/lib/utils/formatting'
import { format } from 'date-fns'
import { renderToString } from 'react-dom/server'
import { LIMIT_LINE_MIN_DISTANCE, LIMIT_LINE_TOLERANCE } from './constants'
import DefaultTooltip from './tooltips'
import type { ResponsiveAxisConfig, TooltipFormatterParamsArray } from './types'

/**
 * Creates a formatter for x-axis labels
 */
export function createXAxisFormatter(
  axisType: string | undefined,
  responsiveConfig: ResponsiveAxisConfig
) {
  return (value: string | number): string => {
    // if this is a time axis, format using our utility
    if (axisType === 'time') {
      const date = new Date(value)
      const isNewDay = date.getHours() === 0 && date.getMinutes() === 0

      // use compact formats for small viewports
      if (responsiveConfig.isVeryCompactTimeFormat) {
        // very compact: just time without seconds or period (e.g., "12:45")
        if (isNewDay) {
          return format(date, 'MMM d')
        }
        return format(date, 'HH:mm')
      } else if (responsiveConfig.isCompactTimeFormat) {
        // compact: time with period but no seconds (e.g., "12:45 PM")
        if (isNewDay) {
          return format(date, 'MMM d')
        }
        return format(date, 'h:mm a')
      } else if (responsiveConfig.shouldHideSeconds) {
        // hide seconds for long timespans (30 minutes or more)
        if (isNewDay) {
          return format(date, 'MMM d')
        }
        return format(date, 'h:mm a')
      }

      // default format with seconds
      return formatTimeAxisLabel(value, isNewDay)
    }
    return String(value)
  }
}

/**
 * Creates a formatter for y-axis labels that accounts for limit lines
 */
export function createYAxisFormatter(yAxisLimit?: number) {
  return (value: number): string => {
    // hide labels that are too close to the limit line
    if (yAxisLimit !== undefined) {
      const tolerance = yAxisLimit * LIMIT_LINE_TOLERANCE
      const minDistance = Math.max(
        tolerance,
        yAxisLimit * LIMIT_LINE_MIN_DISTANCE
      )

      if (Math.abs(value - yAxisLimit) <= minDistance) {
        return '' // hide the label
      }
    }
    return formatAxisNumber(value)
  }
}

/**
 * Creates an interval function for split lines to avoid overlapping with limit line
 */
export function createSplitLineInterval(limit?: number) {
  return (index: number, value: string | number): boolean => {
    if (limit === undefined) return true

    const numValue = typeof value === 'string' ? parseFloat(value) : value
    if (isNaN(numValue)) return true

    const tolerance = limit * LIMIT_LINE_TOLERANCE
    const minDistance = Math.max(tolerance, limit * LIMIT_LINE_MIN_DISTANCE)

    // hide if too close to limit
    return Math.abs(numValue - limit) > minDistance
  }
}

/**
 * Creates a formatter for axis pointer labels
 */
export function createAxisPointerFormatter(axisType?: string) {
  return (params: { value: unknown }): string => {
    if (axisType === 'time') {
      return formatChartTimestampLocal(params.value as string | number)
    }
    return String(params.value)
  }
}

/**
 * Creates the default tooltip formatter
 */
export function createDefaultTooltipFormatter(
  responsiveConfig: ResponsiveAxisConfig
) {
  return (params: TooltipFormatterParamsArray): string => {
    const paramArray = Array.isArray(params) ? params : [params]
    const validParams = paramArray.filter(
      (p) => typeof p !== 'string' && p !== null
    )

    if (validParams.length === 0) return ''

    const firstParam = validParams[0]
    if (!firstParam) return ''

    const timestamp =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (firstParam as any).axisValueLabel ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (firstParam as any).name ||
      ''

    const items = validParams
      .filter((param) => {
        // handle both array values (line/scatter) and single values (bar/pie)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const paramValue = (param as any).value
        if (Array.isArray(paramValue)) {
          return paramValue[1] !== null && paramValue[1] !== undefined
        }
        return paramValue !== null && paramValue !== undefined
      })
      .map((param) => {
        // extract the actual value from various data formats
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const paramValue = (param as any).value
        let actualValue: unknown
        if (Array.isArray(paramValue)) {
          actualValue = paramValue[1] // [x, y] format
        } else {
          actualValue = paramValue // single value format
        }

        // format the value based on its type
        let formattedValue: string
        if (typeof actualValue === 'number') {
          formattedValue = formatNumber(actualValue)
        } else {
          formattedValue = String(actualValue)
        }

        return {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: (param as any).seriesName || 'Value',
          value: formattedValue,
        }
      })

    return renderToString(<DefaultTooltip label={timestamp} items={items} />)
  }
}
