interface SandboxesUsageDelta {
  date: Date
  count: number
}

interface ComputeUsageMonthDelta {
  month: number
  year: number
  total_cost: number
  ram_gb_hours: number
  vcpu_hours: number
}

type UsageData = {
  sandboxes: SandboxesUsageDelta[]
  compute: ComputeUsageMonthDelta[]
  credits: number
}

export type { UsageData, SandboxesUsageDelta, ComputeUsageMonthDelta }
