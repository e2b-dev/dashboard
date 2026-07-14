'use client'

import type { CellContext } from '@tanstack/react-table'
import Link from 'next/link'
import { useMemo } from 'react'
import { PROTECTED_URLS } from '@/configs/urls'
import {
  CapacityUsage,
  CpuUsage,
  ResourceSpec,
} from '@/features/dashboard/common/resource-usage'
import { useTimezone } from '@/features/dashboard/timezone'
import { formatDateParts } from '@/lib/utils/formatting'
import { JsonPopover } from '@/ui/json-popover'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import { DotIcon, PausedIcon } from '@/ui/primitives/icons'
import { useDashboard } from '../../context'
import { useSandboxMetricsStore } from './stores/metrics-store'
import type { SandboxListRow } from './table-config'

const USAGE_TEXT_CLASSNAME = 'prose-table-numeric text-right'

// Live usage is only available for running sandboxes; paused sandboxes fall
// back to their allocated specs.

const CpuUsageCellView = ({
  sandboxId,
  totalCpu,
}: {
  sandboxId: string
  totalCpu?: number
}) => {
  const cpuUsedPct = useSandboxMetricsStore(
    (state) => state.metrics?.[sandboxId]?.cpuUsedPct
  )

  return (
    <CpuUsage
      usedPct={cpuUsedPct}
      cores={totalCpu}
      className={USAGE_TEXT_CLASSNAME}
    />
  )
}

const RamUsageCellView = ({
  sandboxId,
  totalMem,
}: {
  sandboxId: string
  totalMem?: number
}) => {
  const memUsedMb = useSandboxMetricsStore(
    (state) => state.metrics?.[sandboxId]?.memUsedMb
  )

  return (
    <CapacityUsage
      usedGb={memUsedMb != null ? memUsedMb / 1024 : memUsedMb}
      totalGb={totalMem != null ? totalMem / 1024 : totalMem}
      className={USAGE_TEXT_CLASSNAME}
    />
  )
}

const DiskUsageCellView = ({
  sandboxId,
  totalDiskGb,
}: {
  sandboxId: string
  totalDiskGb: number
}) => {
  const diskUsedGb = useSandboxMetricsStore(
    (state) => state.metrics?.[sandboxId]?.diskUsedGb
  )

  return (
    <CapacityUsage
      usedGb={diskUsedGb}
      totalGb={totalDiskGb}
      className={USAGE_TEXT_CLASSNAME}
    />
  )
}

export const CpuUsageCell = ({ row }: CellContext<SandboxListRow, unknown>) => (
  <div className="flex w-full justify-end">
    {row.original.state === 'running' ? (
      <CpuUsageCellView
        sandboxId={row.original.sandboxID}
        totalCpu={row.original.cpuCount}
      />
    ) : (
      <ResourceSpec
        value={row.original.cpuCount}
        unit="Core"
        className={USAGE_TEXT_CLASSNAME}
      />
    )}
  </div>
)

export const RamUsageCell = ({ row }: CellContext<SandboxListRow, unknown>) => (
  <div className="flex w-full justify-end">
    {row.original.state === 'running' ? (
      <RamUsageCellView
        sandboxId={row.original.sandboxID}
        totalMem={row.original.memoryMB}
      />
    ) : (
      <ResourceSpec
        value={row.original.memoryMB / 1024}
        unit="GB"
        className={USAGE_TEXT_CLASSNAME}
      />
    )}
  </div>
)

export const DiskUsageCell = ({
  row,
}: CellContext<SandboxListRow, unknown>) => (
  <div className="flex w-full justify-end">
    {row.original.state === 'running' ? (
      <DiskUsageCellView
        sandboxId={row.original.sandboxID}
        totalDiskGb={row.original.diskSizeMB / 1024}
      />
    ) : (
      <ResourceSpec
        value={row.original.diskSizeMB / 1024}
        unit="GB"
        className={USAGE_TEXT_CLASSNAME}
      />
    )}
  </div>
)

export function StatusCell({ row }: CellContext<SandboxListRow, unknown>) {
  const state = row.original.state

  if (state === 'paused') {
    return (
      <Badge variant="warning" className="uppercase pointer-events-none">
        <PausedIcon className="size-2 fill-current" />
        Paused
      </Badge>
    )
  }

  return (
    <Badge variant="positive" className="uppercase pointer-events-none">
      <DotIcon className="size-3 animate-pulse fill-current" />
      Running
    </Badge>
  )
}

export function IdCell({ getValue }: CellContext<SandboxListRow, unknown>) {
  return (
    <div className="overflow-x-hidden whitespace-nowrap font-mono prose-table-numeric text-fg-secondary">
      {getValue() as string}
    </div>
  )
}

export function TemplateCell({
  row,
  getValue,
}: CellContext<SandboxListRow, unknown>) {
  const templateIdentifier = (getValue() as string | undefined) ?? '--'
  const { team } = useDashboard()
  const templateId = row.original.templateID

  if (!templateId) {
    return (
      <span className="min-w-0 truncate text-fg-tertiary">
        {templateIdentifier}
      </span>
    )
  }

  return (
    <Button asChild variant="link-table" size="none">
      <Link
        href={PROTECTED_URLS.TEMPLATE_OVERVIEW(team.slug, templateId)}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="min-w-0 truncate">{templateIdentifier}</span>
      </Link>
    </Button>
  )
}

export function MetadataCell({
  getValue,
}: CellContext<SandboxListRow, unknown>) {
  const value = (getValue() as string | undefined) ?? '{}'

  const parsedValue = useMemo(() => {
    try {
      return JSON.parse(value)
    } catch {
      return null
    }
  }, [value])

  if (!parsedValue || value.trim() === '{}') {
    return <span className="text-fg-tertiary block w-full truncate">--</span>
  }

  return (
    <JsonPopover
      className="text-fg-tertiary hover:text-fg hover:underline min-w-0 normal-case"
      json={parsedValue}
    >
      <span className="block w-full truncate">{value}</span>
    </JsonPopover>
  )
}

export function StartedAtCell({
  getValue,
}: CellContext<SandboxListRow, unknown>) {
  const { timezone } = useTimezone()
  const dateValue = (getValue() as string | undefined) ?? ''

  const formattedTimestamp = useMemo(() => {
    return formatDateParts(dateValue, {
      timezone,
      format: 'date-time-with-centiseconds',
    })
  }, [dateValue, timezone])

  return (
    <div className="h-full overflow-hidden whitespace-nowrap prose-table-numeric font-mono">
      <span className="text-fg-tertiary">
        {formattedTimestamp?.datePart ?? '--'}
      </span>{' '}
      {formattedTimestamp?.timePart ?? '--'}
      {formattedTimestamp && (
        <span className="text-fg-tertiary">
          .{formattedTimestamp.subsecondPart}
        </span>
      )}
    </div>
  )
}

export function LegacyStartedAtCell({
  getValue,
}: CellContext<SandboxListRow, unknown>) {
  const { timezone } = useTimezone()
  const dateValue = (getValue() as string | undefined) ?? ''

  const formattedTimestamp = useMemo(() => {
    return formatDateParts(dateValue, {
      timezone,
      format: 'date-time-no-seconds',
    })
  }, [dateValue, timezone])

  return (
    <div className="h-full overflow-x-hidden whitespace-nowrap font-mono prose-table-numeric">
      <span className="text-fg-tertiary">
        {formattedTimestamp?.datePart ?? '--'}
      </span>{' '}
      {formattedTimestamp?.timePart ?? '--'}{' '}
      <span className="text-fg-tertiary">
        {formattedTimestamp?.timezonePart ?? ''}
      </span>
    </div>
  )
}
