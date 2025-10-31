export type SamplingMode = 'hourly' | 'daily' | 'weekly'

export interface ComputUsageAxisPoint {
  x: string
  y: number
}

export interface Timeframe {
  start: number
  end: number
}

export interface DisplayValue {
  displayValue: string
  label: string
  timestamp: string | null
}

export interface MetricTotals {
  sandboxes: number
  cost: number
  vcpu: number
  ram: number
}

export interface ComputeUsageSeriesData {
  sandboxes: ComputUsageAxisPoint[]
  cost: ComputUsageAxisPoint[]
  vcpu: ComputUsageAxisPoint[]
  ram: ComputUsageAxisPoint[]
}

/**
 * Sampled data point - represents aggregated usage for a time period
 */
export interface SampledDataPoint {
  timestamp: number //  start of the period (day or week)
  sandboxCount: number
  cost: number
  vcpuHours: number
  ramGibHours: number
}
