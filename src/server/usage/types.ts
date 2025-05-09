export interface Usage {
  month: number
  year: number
  template_usage: TemplateUsage[]
}

export interface TemplateUsage {
  total_cost: number
  ram_gb_hours: number
  sandbox_hours: number
}

export interface UsageResponse {
  usages: Usage[]
}

export interface PlotData {
  x: string
  y: number
}

export interface Series {
  id: string
  data: PlotData[]
}

export interface TransformedUsageData {
  vcpuSeries: Series[]
  ramSeries: Series[]
  costSeries: Series[]
}

interface SandboxesStartedDelta {
  date: Date
  count: number
}

export type SandboxesStartedData = SandboxesStartedDelta[]
