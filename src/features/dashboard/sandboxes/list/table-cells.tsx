'use client'

import { PROTECTED_URLS } from '@/configs/urls'
import ResourceUsage from '@/features/dashboard/common/resource-usage'
import { useTemplateTableStore } from '@/features/dashboard/templates/list/stores/table-store'
import { JsonPopover } from '@/ui/json-popover'
import { Button } from '@/ui/primitives/button'
import type { CellContext } from '@tanstack/react-table'
import { ArrowUpRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import { useDashboard } from '../../context'
import { useSandboxMetricsStore } from './stores/metrics-store'
import type { SandboxListRow } from './table-config'

const USAGE_TEXT_CLASSNAME = 'prose-table-numeric text-right'
const MONO_NUMERIC_TEXT_CLASSNAME =
  'overflow-x-hidden whitespace-nowrap font-mono prose-table-numeric'

const formatUtcTimestamp = (dateValue: string, timeLength: number) => {
  const date = new Date(dateValue)

  if (Number.isNaN(date.getTime())) {
    return ['--', '--'] as const
  }

  const [isoDate, isoTimeWithMillis] = date.toISOString().split('T')

  return [isoDate ?? '--', isoTimeWithMillis?.slice(0, timeLength) ?? '--'] as const
}

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

export const CpuUsageCell = ({
  row,
}: CellContext<SandboxListRow, unknown>) => (
  <div className="flex w-full justify-end">
    <CpuUsageCellView
      sandboxId={row.original.sandboxID}
      totalCpu={row.original.cpuCount}
    />
  </div>
)

export const RamUsageCell = ({
  row,
}: CellContext<SandboxListRow, unknown>) => (
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
  const metric = useSandboxMetricsStore(
    (state) => state.metrics?.[row.original.sandboxID]
  )

  const diskSizeGB = row.original.diskSizeMB / 1024

  return (
    <div className="flex w-full justify-end">
      <ResourceUsage
        type="disk"
        metrics={metric?.diskUsedGb}
        total={diskSizeGB}
        classNames={{ wrapper: USAGE_TEXT_CLASSNAME }}
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
  const router = useRouter()
  const templateId = row.original.templateID

  return (
    <Button
      variant="link"
      className="text-fg h-auto p-0 font-sans prose-table normal-case"
      onClick={(event) => {
        event.stopPropagation()
        event.preventDefault()

        if (!templateId) {
          return
        }

        useTemplateTableStore.getState().setGlobalFilter(templateId)
        router.push(PROTECTED_URLS.TEMPLATES(team.slug ?? team.id))
      }}
    >
      {templateIdentifier}
      <ArrowUpRight className="size-3" />
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
    return <span className="text-fg-tertiary">n/a</span>
  }

  return (
    <JsonPopover
      className="text-fg-tertiary hover:text-fg hover:underline"
      json={parsedValue}
    >
      {value}
    </JsonPopover>
  )
}

export function StartedAtCell({
  getValue,
}: CellContext<SandboxListRow, unknown>) {
  const dateValue = (getValue() as string | undefined) ?? ''

  const [datePart, timePart] = useMemo(() => {
    return formatUtcTimestamp(dateValue, 8)
  }, [dateValue])

  return (
    <div className={`h-full ${MONO_NUMERIC_TEXT_CLASSNAME}`}>
      <span className="text-fg-secondary">{datePart}</span>{' '}
      <span className="text-fg-tertiary">{timePart}</span>{' '}
      <span className="text-fg-tertiary">UTC</span>
    </div>
  )
}
