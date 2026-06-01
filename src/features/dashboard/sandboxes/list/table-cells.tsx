'use client'

import type { CellContext } from '@tanstack/react-table'
import Link from 'next/link'
import { useMemo } from 'react'
import { PROTECTED_URLS } from '@/configs/urls'
import ResourceUsage from '@/features/dashboard/common/resource-usage'
import { formatLocalLogStyleTimestamp } from '@/lib/utils/formatting'
import { JsonPopover } from '@/ui/json-popover'
import { Button } from '@/ui/primitives/button'
import { ExternalLinkIcon } from '@/ui/primitives/icons'
import { useDashboard } from '../../context'
import { useSandboxMetricsStore } from './stores/metrics-store'
import type { SandboxListRow } from './table-config'

const USAGE_TEXT_CLASSNAME = 'prose-table-numeric text-right'
const MONO_NUMERIC_TEXT_CLASSNAME =
  'overflow-x-hidden whitespace-nowrap font-mono prose-table-numeric'

type CpuUsageCellProps = { sandboxId: string; totalCpu?: number }
const CpuUsageCellView = ({ sandboxId, totalCpu }: CpuUsageCellProps) => {
  const cpuUsedPct = useSandboxMetricsStore(
    (state) => state.metrics?.[sandboxId]?.cpuUsedPct
  )

  return (
    <ResourceUsage
      type="cpu"
      metrics={cpuUsedPct}
      total={totalCpu}
      classNames={{ wrapper: USAGE_TEXT_CLASSNAME }}
    />
  )
}

type RamUsageCellProps = { sandboxId: string; totalMem?: number }
const RamUsageCellView = ({ sandboxId, totalMem }: RamUsageCellProps) => {
  const memUsedMb = useSandboxMetricsStore(
    (state) => state.metrics?.[sandboxId]?.memUsedMb
  )

  return (
    <ResourceUsage
      type="mem"
      metrics={memUsedMb}
      total={totalMem}
      classNames={{ wrapper: USAGE_TEXT_CLASSNAME }}
    />
  )
}

type DiskUsageCellProps = { sandboxId: string; totalDiskGb: number }
const DiskUsageCellView = ({ sandboxId, totalDiskGb }: DiskUsageCellProps) => {
  const diskUsedGb = useSandboxMetricsStore(
    (state) => state.metrics?.[sandboxId]?.diskUsedGb
  )

  return (
    <ResourceUsage
      type="disk"
      metrics={diskUsedGb}
      total={totalDiskGb}
      classNames={{ wrapper: USAGE_TEXT_CLASSNAME }}
    />
  )
}

export const CpuUsageCell = ({ row }: CellContext<SandboxListRow, unknown>) => (
  <div className="flex w-full justify-end">
    <CpuUsageCellView
      sandboxId={row.original.sandboxID}
      totalCpu={row.original.cpuCount}
    />
  </div>
)

export const RamUsageCell = ({ row }: CellContext<SandboxListRow, unknown>) => (
  <div className="flex w-full justify-end">
    <RamUsageCellView
      sandboxId={row.original.sandboxID}
      totalMem={row.original.memoryMB}
    />
  </div>
)

export const DiskUsageCell = ({
  row,
}: CellContext<SandboxListRow, unknown>) => {
  const diskSizeGB = row.original.diskSizeMB / 1024

  return (
    <div className="flex w-full justify-end">
      <DiskUsageCellView
        sandboxId={row.original.sandboxID}
        totalDiskGb={diskSizeGB}
      />
    </div>
  )
}

export function IdCell({ getValue }: CellContext<SandboxListRow, unknown>) {
  return (
    <div
      className={`${MONO_NUMERIC_TEXT_CLASSNAME} text-fg-tertiary select-all`}
    >
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
        href={PROTECTED_URLS.TEMPLATE_DETAIL(team.slug, templateId)}
        onClick={(e) => e.stopPropagation()}
      >
        <span className="min-w-0 truncate">{templateIdentifier}</span>
        <ExternalLinkIcon className="size-3 shrink-0" />
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
    return <span className="text-fg-tertiary block w-full truncate">n/a</span>
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
  const dateValue = (getValue() as string | undefined) ?? ''

  const formattedTimestamp = useMemo(() => {
    return formatLocalLogStyleTimestamp(dateValue)
  }, [dateValue])

  return (
    <div className={`h-full ${MONO_NUMERIC_TEXT_CLASSNAME}`}>
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
