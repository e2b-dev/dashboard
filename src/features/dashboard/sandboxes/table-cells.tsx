'use client'

import { PROTECTED_URLS } from '@/configs/urls'
import { useServerContext } from '@/features/dashboard/server-context'
import { Template } from '@/types/api'
import { JsonPopover } from '@/ui/json-popover'
import { Button } from '@/ui/primitives/button'
import { CellContext } from '@tanstack/react-table'
import { ArrowUpRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
import ResourceUsage from '../common/resource-usage'
import { useTemplateTableStore } from '../templates/stores/table-store'
import { useSandboxMetricsStore } from './stores/metrics-store'
import { SandboxWithMetrics } from './table-config'

declare module '@tanstack/react-table' {
  interface TableState {
    templates?: Template[]
  }
}

export function CpuUsageCell({
  row,
}: CellContext<SandboxWithMetrics, unknown>) {
  const metrics = useSandboxMetricsStore(
    (s) => s.metrics?.[row.original.sandboxID]
  )

  return (
    <ResourceUsage
      type="cpu"
      metrics={metrics?.cpuUsedPct}
      total={row.original.cpuCount}
    />
  )
}

export function RamUsageCell({
  row,
}: CellContext<SandboxWithMetrics, unknown>) {
  const metrics = useSandboxMetricsStore(
    (s) => s.metrics?.[row.original.sandboxID]
  )

  return (
    <ResourceUsage
      type="mem"
      metrics={metrics?.memUsedMb}
      total={row.original.memoryMB}
    />
  )
}

export function DiskUsageCell({
  row,
}: CellContext<SandboxWithMetrics, unknown>) {
  const metrics = useSandboxMetricsStore(
    (s) => s.metrics?.[row.original.sandboxID]
  )

  return (
    <ResourceUsage
      type="disk"
      metrics={metrics?.diskUsedGb}
      total={metrics?.diskTotalGb}
    />
  )
}

// ---------- Generic column cell components ----------

export function IdCell({ getValue }: CellContext<SandboxWithMetrics, unknown>) {
  return (
    <div className="text-fg-tertiary truncate font-mono text-xs">
      {getValue() as string}
    </div>
  )
}

export function TemplateCell({
  getValue,
  table,
}: CellContext<SandboxWithMetrics, unknown>) {
  const templateId = getValue() as string
  const template: Template | undefined = table
    .getState()
    .templates?.find((t: Template) => t.templateID === templateId)
  const { selectedTeamSlug, selectedTeamId } = useServerContext()
  const router = useRouter()

  if (!selectedTeamSlug || !selectedTeamId) return null

  return (
    <Button
      variant="link"
      className="text-fg h-auto p-0 text-xs normal-case"
      onClick={(e) => {
        e.stopPropagation()
        e.preventDefault()

        useTemplateTableStore.getState().setGlobalFilter(templateId)
        router.push(
          PROTECTED_URLS.TEMPLATES(selectedTeamSlug ?? selectedTeamId)
        )
      }}
    >
      {template?.aliases?.[0] ?? templateId}
      <ArrowUpRight className="size-3" />
    </Button>
  )
}

export function MetadataCell({
  getValue,
}: CellContext<SandboxWithMetrics, unknown>) {
  const value = getValue() as string
  const json = useMemo(() => JSON.parse(value), [value])

  if (value.trim() === '{}') {
    return <span className="text-fg-tertiary">n/a</span>
  }

  return (
    <JsonPopover
      className="text-fg-tertiary hover:text-fg hover:underline"
      json={json}
    >
      {value}
    </JsonPopover>
  )
}

export function StartedAtCell({
  getValue,
}: CellContext<SandboxWithMetrics, unknown>) {
  const dateValue = getValue() as string
  const dateTimeString = useMemo(
    () => new Date(dateValue).toUTCString(),
    [dateValue]
  )
  const [day, date, month, year, time, timezone] = useMemo(
    () => dateTimeString.split(' '),
    [dateTimeString]
  )

  return (
    <div className="h-full truncate font-mono text-xs">
      <span className="text-fg-tertiary">{`${day} ${date} ${month} ${year}`}</span>{' '}
      <span className="text-fg">{time}</span>{' '}
      <span className="text-fg-tertiary">{timezone}</span>
    </div>
  )
}
