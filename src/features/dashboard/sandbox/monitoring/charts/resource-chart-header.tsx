'use client'

import type { SandboxMetric } from '@/server/api/models/sandboxes.models'
import { CpuIcon, MemoryIcon } from '@/ui/primitives/icons'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface ResourceChartHeaderProps {
  metric?: SandboxMetric
  hovered?: {
    cpuPercent: number | null
    ramPercent: number | null
    timestampMs: number
  } | null
}

function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return '--'
  }

  return `${Math.round(value)}%`
}

function formatCores(value: number) {
  const normalized = Math.max(0, Math.round(value))
  return `${normalized} ${normalized === 1 ? 'CORE' : 'CORES'}`
}

function formatRamTotalGb(bytes: number) {
  const gb = bytes / 1024 / 1024 / 1024
  const rounded = gb >= 10 ? gb.toFixed(0) : gb.toFixed(1)
  return `${rounded.replace(/\.0$/, '')} GB`
}

function formatHoverTimestamp(timestampMs: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestampMs))
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
      <span className={cn('h-px w-5 shrink-0 rounded-full', indicatorClassName)} />
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
}: ResourceChartHeaderProps) {
  const cpuPercent = hovered ? hovered.cpuPercent : (metric?.cpuUsedPct ?? 0)
  const cpuValue = `${formatPercent(cpuPercent)} · ${formatCores(metric?.cpuCount ?? 0)}`

  const ramPercent = hovered
    ? hovered.ramPercent
    : metric
      ? metric.memTotal > 0
        ? (metric.memUsed / metric.memTotal) * 100
        : 0
      : 0
  const ramTotalGb = formatRamTotalGb(metric?.memTotal ?? 0)
  const ramValue = `${formatPercent(ramPercent)} · ${ramTotalGb}`
  const contextLabel = hovered ? formatHoverTimestamp(hovered.timestampMs) : null

  return (
    <div className="flex items-center justify-between gap-4 pb-2 border-b mb-3">
      <div className="flex items-center gap-5">
        <MetricItem
          label="CPU"
          value={cpuValue}
          indicatorClassName="bg-graph-3"
          icon={<CpuIcon className="text-fg size-4.5" />}
        />

        <MetricItem
          label="RAM"
          value={ramValue}
          indicatorClassName="bg-graph-1"
          icon={<MemoryIcon className="text-fg size-4.5" />}
        />
      </div>
      {contextLabel ? (
        <span className="prose-label text-fg-tertiary uppercase">
          {contextLabel}
        </span>
      ) : null}
    </div>
  )
}
