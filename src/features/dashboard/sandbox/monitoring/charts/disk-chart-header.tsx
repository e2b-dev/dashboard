'use client'

import type { SandboxMetric } from '@/server/api/models/sandboxes.models'
import { StorageIcon } from '@/ui/primitives/icons'

interface DiskChartHeaderProps {
  metric?: SandboxMetric
  hovered?: {
    diskPercent: number | null
    timestampMs: number
  } | null
}

function formatPercent(value: number | null) {
  if (value === null || Number.isNaN(value)) {
    return '--'
  }

  return `${Math.round(value)}%`
}

function formatDiskTotalGb(bytes: number) {
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

export default function DiskChartHeader({ metric, hovered }: DiskChartHeaderProps) {
  const diskPercent = hovered
    ? hovered.diskPercent
    : metric
      ? metric.diskTotal > 0
        ? (metric.diskUsed / metric.diskTotal) * 100
        : 0
      : 0

  const diskTotalGb = formatDiskTotalGb(metric?.diskTotal ?? 0)
  const contextLabel = hovered ? formatHoverTimestamp(hovered.timestampMs) : null

  return (
    <div className="text-fg-tertiary flex items-center justify-between gap-4 border-y py-2 mb-3">
      <div className="flex items-center gap-1.5">
        <span className="h-px w-5 shrink-0 rounded-full bg-graph-2" />
        <StorageIcon className="size-4.5 text-fg" />
        <span className="prose-label uppercase">
          <span className="text-[12px] text-fg">DISK</span>
          <span className="mx-1"> </span>
          <span>{`${formatPercent(diskPercent)} · ${diskTotalGb}`}</span>
        </span>
      </div>
      {contextLabel ? (
        <span className="prose-label text-fg-tertiary uppercase">
          {contextLabel}
        </span>
      ) : null}
    </div>
  )
}
