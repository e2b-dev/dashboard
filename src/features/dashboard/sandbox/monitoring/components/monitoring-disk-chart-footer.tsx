'use client'

import { useSandboxContext } from '@/features/dashboard/sandbox/context'
import { cn } from '@/lib/utils'
import { formatNumber } from '@/lib/utils/formatting'
import { StorageIcon } from '@/ui/primitives/icons'
import {
  SANDBOX_MONITORING_DISK_INDICATOR_CLASS,
  SANDBOX_MONITORING_DISK_SERIES_LABEL,
} from '../utils/constants'

export default function DiskChartFooter() {
  const { sandboxInfo } = useSandboxContext()

  const diskValue = sandboxInfo
    ? `${formatNumber(sandboxInfo.diskSizeMB)} MB`
    : '--'

  return (
    <div className="text-fg-tertiary flex items-center gap-1.5">
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
        <span>{diskValue}</span>
      </span>
    </div>
  )
}
