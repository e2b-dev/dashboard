'use client'

import { cn } from '@/lib/utils'
import type { SandboxMetric } from '@/server/api/models/sandboxes.models'
import { CpuIcon, MemoryIcon } from '@/ui/primitives/icons'
import type { ReactNode } from 'react'
import {
  SANDBOX_MONITORING_CPU_INDICATOR_CLASS,
  SANDBOX_MONITORING_CPU_SERIES_LABEL,
  SANDBOX_MONITORING_RAM_INDICATOR_CLASS,
  SANDBOX_MONITORING_RAM_SERIES_LABEL,
} from '../utils/constants'
import {
  calculateRatioPercent,
  formatBytesToGb,
  formatCoreCount,
  formatHoverTimestamp,
  formatMetricValue,
  formatPercent,
} from '../utils/formatters'

interface ResourceChartHeaderProps {
  metric?: SandboxMetric
  hovered?: {
    cpuPercent: number | null
    ramPercent: number | null
    timestampMs: number
  } | null
  suffix?: ReactNode
}

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

export default function ResourceChartHeader({
  metric,
  hovered,
  suffix,
}: ResourceChartHeaderProps) {
  const cpuPercent = hovered ? hovered.cpuPercent : (metric?.cpuUsedPct ?? 0)
  const cpuValue = formatMetricValue(
    formatPercent(cpuPercent),
    formatCoreCount(metric?.cpuCount ?? 0)
  )

  const ramPercent = hovered
    ? hovered.ramPercent
    : metric
      ? calculateRatioPercent(metric.memUsed, metric.memTotal)
      : 0
  const ramTotalGb = formatBytesToGb(metric?.memTotal ?? 0)
  const ramValue = formatMetricValue(formatPercent(ramPercent), ramTotalGb)
  const contextLabel = hovered
    ? formatHoverTimestamp(hovered.timestampMs)
    : null

  return (
    <div className="flex items-center justify-between gap-4 pb-2 border-b mb-3">
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
      <div className="flex flex-wrap items-center justify-end gap-2">
        {contextLabel ? (
          <span className="prose-label text-fg-tertiary uppercase">
            {contextLabel}
          </span>
        ) : null}
        {suffix}
      </div>
    </div>
  )
}
