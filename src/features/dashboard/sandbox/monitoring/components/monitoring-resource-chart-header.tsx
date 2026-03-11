'use client'

import type { ReactNode } from 'react'
import { useSandboxContext } from '@/features/dashboard/sandbox/context'
import { cn } from '@/lib/utils'
import { formatCPUCores, formatMemory } from '@/lib/utils/formatting'
import { CpuIcon, MemoryIcon } from '@/ui/primitives/icons'
import {
  SANDBOX_MONITORING_CPU_INDICATOR_CLASS,
  SANDBOX_MONITORING_CPU_SERIES_LABEL,
  SANDBOX_MONITORING_RAM_INDICATOR_CLASS,
  SANDBOX_MONITORING_RAM_SERIES_LABEL,
} from '../utils/constants'

interface MetricItemProps {
  label: string
  value: string
  indicatorClassName: string
  icon: ReactNode
}

function MetricItem({
  label,
  value,
  indicatorClassName,
  icon,
}: MetricItemProps) {
  return (
    <div className="text-fg-tertiary flex items-center gap-1.5">
      <span
        className={cn('h-px w-5 shrink-0 rounded-full', indicatorClassName)}
      />
      {icon}
      <span className="prose-label uppercase">
        <span className="text-fg text-[12px]">{label}</span>
        <span className="mx-1"> </span>
        <span>{value}</span>
      </span>
    </div>
  )
}

export default function ResourceChartHeader() {
  const { sandboxInfo } = useSandboxContext()

  const cpuValue = sandboxInfo ? formatCPUCores(sandboxInfo.cpuCount) : '--'
  const ramValue = sandboxInfo ? formatMemory(sandboxInfo.memoryMB) : '--'

  return (
    <div className="flex items-center gap-5">
      <MetricItem
        label={SANDBOX_MONITORING_CPU_SERIES_LABEL}
        value={cpuValue}
        indicatorClassName={SANDBOX_MONITORING_CPU_INDICATOR_CLASS}
        icon={<CpuIcon className="text-fg size-4.5" />}
      />

      <MetricItem
        label={SANDBOX_MONITORING_RAM_SERIES_LABEL}
        value={ramValue}
        indicatorClassName={SANDBOX_MONITORING_RAM_INDICATOR_CLASS}
        icon={<MemoryIcon className="text-fg size-4.5" />}
      />
    </div>
  )
}
