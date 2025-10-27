import {
  formatDateRange,
  formatDay,
  formatNumber,
} from '@/lib/utils/formatting'
import { getWeekEnd } from './sampling-utils'
import { DisplayValue, SamplingMode } from './types'

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
  if (samplingMode === 'weekly') {
    const weekEnd = getWeekEnd(timestamp)
    const timestampLabel = formatDateRange(timestamp, weekEnd)

    return {
      sandboxes: {
        displayValue: formatNumber(sandboxCount),
        label: 'week of',
        timestamp: timestampLabel,
      },
      cost: {
        displayValue: `$${cost.toFixed(2)}`,
        label: 'week of',
        timestamp: timestampLabel,
      },
      vcpu: {
        displayValue: formatNumber(vcpuHours),
        label: 'week of',
        timestamp: timestampLabel,
      },
      ram: {
        displayValue: formatNumber(ramGibHours),
        label: 'week of',
        timestamp: timestampLabel,
      },
    }
  }

  // daily mode
  const timestampLabel = formatDay(timestamp)

  return {
    sandboxes: {
      displayValue: formatNumber(sandboxCount),
      label: 'on',
      timestamp: timestampLabel,
    },
    cost: {
      displayValue: `$${cost.toFixed(2)}`,
      label: 'on',
      timestamp: timestampLabel,
    },
    vcpu: {
      displayValue: formatNumber(vcpuHours),
      label: 'on',
      timestamp: timestampLabel,
    },
    ram: {
      displayValue: formatNumber(ramGibHours),
      label: 'on',
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
