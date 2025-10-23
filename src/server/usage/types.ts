interface SandboxesUsageDelta {
  date: Date
  count: number
}

interface ComputeUsageDelta {
  date: Date
  total_cost: number
  ram_gb_hours: number
  vcpu_hours: number
}

type UsageData = {
  sandboxes: SandboxesUsageDelta[]
  compute: ComputeUsageDelta[]
  credits: number
}

export type { ComputeUsageDelta, SandboxesUsageDelta, UsageData }
