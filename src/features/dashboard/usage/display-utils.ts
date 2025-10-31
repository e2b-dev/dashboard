import {
  formatDateRange,
  formatDay,
  formatHour,
  formatNumber,
} from '@/lib/utils/formatting'
import { DisplayValue, SampledDataPoint, SamplingMode } from './types'

/**
 * Formats display values for a specific sampled data point (when hovering)
 */
export function formatHoveredValues(
  sandboxCount: number,
  cost: number,
  vcpuHours: number,
  ramGibHours: number,
  timestamp: number,
  samplingMode: SamplingMode
): {
  sandboxes: DisplayValue
  cost: DisplayValue
  vcpu: DisplayValue
  ram: DisplayValue
} {
  let timestampLabel: string
  let label: string

  switch (samplingMode) {
    case 'hourly':
      timestampLabel = formatHour(timestamp)
      label = 'at'
      break

    case 'weekly':
      const weekEnd = getWeekEnd(timestamp)
      timestampLabel = formatDateRange(timestamp, weekEnd)
      label = 'week of'
      break

    case 'daily':
      timestampLabel = formatDay(timestamp)
      label = 'on'
      break
  }

  return {
    sandboxes: {
      displayValue: formatNumber(sandboxCount),
      label,
      timestamp: timestampLabel,
    },
    cost: {
      displayValue: `$${cost.toFixed(2)}`,
      label,
      timestamp: timestampLabel,
    },
    vcpu: {
      displayValue: formatNumber(vcpuHours),
      label,
      timestamp: timestampLabel,
    },
    ram: {
      displayValue: formatNumber(ramGibHours),
      label,
      timestamp: timestampLabel,
    },
  }
}

/**
 * Formats display values for total aggregates (no hover)
 */
export function formatTotalValues(totals: {
  sandboxes: number
  cost: number
  vcpu: number
  ram: number
}): {
  sandboxes: DisplayValue
  cost: DisplayValue
  vcpu: DisplayValue
  ram: DisplayValue
} {
  return {
    sandboxes: {
      displayValue: formatNumber(totals.sandboxes),
      label: 'total over range',
      timestamp: null,
    },
    cost: {
      displayValue: `$${totals.cost.toFixed(2)}`,
      label: 'total over range',
      timestamp: null,
    },
    vcpu: {
      displayValue: formatNumber(totals.vcpu),
      label: 'total over range',
      timestamp: null,
    },
    ram: {
      displayValue: formatNumber(totals.ram),
      label: 'total over range',
      timestamp: null,
    },
  }
}

/**
 * Formats display values for empty state (no data in range)
 */
export function formatEmptyValues(): {
  sandboxes: DisplayValue
  cost: DisplayValue
  vcpu: DisplayValue
  ram: DisplayValue
} {
  return {
    sandboxes: {
      displayValue: '0',
      label: 'no data in range',
      timestamp: null,
    },
    cost: {
      displayValue: '$0.00',
      label: 'no data in range',
      timestamp: null,
    },
    vcpu: {
      displayValue: '0',
      label: 'no data in range',
      timestamp: null,
    },
    ram: {
      displayValue: '0',
      label: 'no data in range',
      timestamp: null,
    },
  }
}

export function roundToStartOfSamplingPeriod(
  timestamp: number,
  samplingMode: SamplingMode
): number {
  const date = new Date(timestamp)

  switch (samplingMode) {
    case 'hourly': {
      const minute = date.getMinutes()
      const thisHourStart = new Date(date)
      thisHourStart.setMinutes(0, 0, 0)

      const isSecondHalf = minute >= 30
      if (isSecondHalf) {
        const nextHourStart = new Date(thisHourStart)
        nextHourStart.setHours(thisHourStart.getHours() + 1)
        return nextHourStart.getTime()
      }

      return thisHourStart.getTime()
    }

    case 'daily': {
      const hour = date.getHours()
      const thisDayStart = new Date(date)
      thisDayStart.setHours(0, 0, 0, 0)

      const isSecondHalf = hour >= 12
      if (isSecondHalf) {
        const nextDayStart = new Date(thisDayStart)
        nextDayStart.setDate(thisDayStart.getDate() + 1)
        return nextDayStart.getTime()
      }

      return thisDayStart.getTime()
    }

    case 'weekly': {
      const date = new Date(timestamp)
      const dayOfWeek = date.getDay()
      const hour = date.getHours()

      const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1

      const thisWeekStart = new Date(date)
      thisWeekStart.setDate(date.getDate() - daysFromMonday)
      thisWeekStart.setHours(0, 0, 0, 0)

      // determine if we're in the second half of the week (Thursday 00:00 onwards)
      const isSecondHalf =
        daysFromMonday >= 3 || (daysFromMonday === 3 && hour >= 12)

      if (isSecondHalf) {
        const nextWeekStart = new Date(thisWeekStart)
        nextWeekStart.setDate(thisWeekStart.getDate() + 7)
        return nextWeekStart.getTime()
      }

      return thisWeekStart.getTime()
    }
  }
}

/**
 * Gets the end timestamp (Sunday 23:59:59.999) for a given week start (Monday)
 */
export function getWeekEnd(weekStart: number): number {
  const endDate = new Date(weekStart)

  endDate.setDate(endDate.getDate() + 6) // add 6 days to Monday = Sunday
  endDate.setHours(23, 59, 59, 999)

  return endDate.getTime()
}

export function findHoveredDataPoint(
  sampledData: SampledDataPoint[],
  hoveredTimestamp: number,
  samplingMode: SamplingMode
): SampledDataPoint {
  const roundedTimestamp = roundToStartOfSamplingPeriod(
    hoveredTimestamp,
    samplingMode
  )

  const existingPoint = sampledData.find(
    (d) => d.timestamp === roundedTimestamp
  )

  return (
    existingPoint || {
      timestamp: roundedTimestamp,
      sandboxCount: 0,
      cost: 0,
      vcpuHours: 0,
      ramGibHours: 0,
    }
  )
}

export function calculateTotals(sampledData: SampledDataPoint[]): {
  sandboxes: number
  cost: number
  vcpu: number
  ram: number
} {
  return sampledData.reduce(
    (acc, point) => ({
      sandboxes: acc.sandboxes + point.sandboxCount,
      cost: acc.cost + point.cost,
      vcpu: acc.vcpu + point.vcpuHours,
      ram: acc.ram + point.ramGibHours,
    }),
    { sandboxes: 0, cost: 0, vcpu: 0, ram: 0 }
  )
}
