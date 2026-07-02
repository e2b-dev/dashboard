import {
  formatAxisNumber,
  formatCurrency,
  formatNumber,
} from '@/lib/utils/formatting'

export type UsageMetricKey = 'cost' | 'sandboxes' | 'vcpu' | 'ram'

export interface UsageMetricMeta {
  label: string
  color: string
  /** Full-precision value for tooltips and totals. */
  format: (value: number) => string
  /** Abbreviated value for chart axes. */
  axisFormat: (value: number) => string
}

export const USAGE_METRICS: Record<UsageMetricKey, UsageMetricMeta> = {
  cost: {
    label: 'Cost',
    color: 'var(--accent-main-highlight)',
    format: (value) => formatCurrency(value),
    axisFormat: (value) => `$${formatAxisNumber(value)}`,
  },
  sandboxes: {
    label: 'Sandboxes',
    color: 'var(--graph-6)',
    format: (value) => formatNumber(value),
    axisFormat: (value) => formatAxisNumber(value),
  },
  vcpu: {
    label: 'vCPU Hours',
    color: 'var(--graph-2)',
    format: (value) => formatNumber(value, 'en-US', 2),
    axisFormat: (value) => formatAxisNumber(value),
  },
  ram: {
    label: 'RAM Hours',
    color: 'var(--graph-4)',
    format: (value) => formatNumber(value, 'en-US', 2),
    axisFormat: (value) => formatAxisNumber(value),
  },
}
