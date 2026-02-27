'use client'

import { cn } from '@/lib/utils'
import type { SandboxMetric } from '@/server/api/models/sandboxes.models'
import { StorageIcon } from '@/ui/primitives/icons'
import {
  SANDBOX_MONITORING_DISK_INDICATOR_CLASS,
  SANDBOX_MONITORING_DISK_SERIES_LABEL,
} from '../utils/constants'
import {
  calculateRatioPercent,
  formatBytesToGb,
  formatHoverTimestamp,
  formatMetricValue,
  formatPercent,
} from '../utils/formatters'

interface DiskChartHeaderProps {
  metric?: SandboxMetric
  hovered?: {
    diskPercent: number | null
    timestampMs: number
  } | null
}

export default function DiskChartHeader({
  metric,
  hovered,
}: DiskChartHeaderProps) {
  const diskPercent = hovered
    ? hovered.diskPercent
    : metric
      ? calculateRatioPercent(metric.diskUsed, metric.diskTotal)
      : 0

  const diskTotalGb = formatBytesToGb(metric?.diskTotal ?? 0)
  const contextLabel = hovered
    ? formatHoverTimestamp(hovered.timestampMs)
    : null

  return (
    <div className="text-fg-tertiary flex items-center justify-between gap-4 border-y py-3 mb-3">
      <div className="flex items-center gap-1.5">
        <span
          className={cn(
            'h-px w-5 shrink-0 rounded-full',
            SANDBOX_MONITORING_DISK_INDICATOR_CLASS
          )}
        />
        <StorageIcon className="size-4.5 text-fg" />
        <span className="prose-label uppercase">
          <span className="text-[12px] text-fg">
            {SANDBOX_MONITORING_DISK_SERIES_LABEL}
          </span>
          <span className="mx-1"> </span>
          <span>{formatMetricValue(formatPercent(diskPercent), diskTotalGb)}</span>
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
