'use client'

import { PROTECTED_URLS } from '@/configs/urls'
import { useServerContext } from '@/features/dashboard/server-context'
import { cn } from '@/lib/utils'
import { Template } from '@/types/api'
import { JsonPopover } from '@/ui/json-popover'
import { Button } from '@/ui/primitives/button'
import { CellContext } from '@tanstack/react-table'
import { ArrowUpRight } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useMemo } from 'react'
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

  const percentage = metrics?.cpuUsedPct ?? 0
  const cpuCount = row.original.cpuCount

  const hasMetrics = metrics !== null && metrics !== undefined

  const textClassName = useMemo(
    () =>
      cn(
        percentage >= 90
          ? 'text-error'
          : percentage >= 70
            ? 'text-warning'
            : 'text-fg'
      ),
    [percentage]
  )

  return (
    <span
      className={cn('text-fg-500 inline truncate font-mono whitespace-nowrap')}
    >
      {hasMetrics ? (
        <>
          <span className={textClassName}>{percentage}% </span>
          <span className="text-fg-500">·</span>
        </>
      ) : (
        <>
          <span className="text-fg-500">n/a </span>
          <span className="text-fg-500">·</span>
        </>
      )}
      <span className="text-contrast-2"> {cpuCount ?? '-'}</span>&nbsp;Core
      {cpuCount && cpuCount > 1 ? 's' : ''}
    </span>
  )
}

export function RamUsageCell({
  row,
}: CellContext<SandboxWithMetrics, unknown>) {
  const metrics = useSandboxMetricsStore(
    (s) => s.metrics?.[row.original.sandboxID]
  )

  const percentage = useMemo(() => {
    if (metrics?.memUsedMb && metrics.memTotalMb) {
      return Number(((metrics.memUsedMb / metrics.memTotalMb) * 100).toFixed(2))
    }
    return 0
  }, [metrics])

  const hasMetrics = metrics !== null && metrics !== undefined

  const totalRamMB = useMemo(
    () => row.original.memoryMB.toLocaleString(),
    [row.original.memoryMB]
  )

  const usedRamMB = useMemo(
    () => (hasMetrics ? metrics.memUsedMb.toLocaleString() : 'n/a'),
    [hasMetrics, metrics]
  )

  const textClassName = useMemo(
    () =>
      cn(
        percentage >= 95
          ? 'text-error'
          : percentage >= 70
            ? 'text-warning'
            : 'text-fg'
      ),
    [percentage]
  )

  return (
    <span
      className={cn('text-fg-500 inline truncate font-mono whitespace-nowrap')}
    >
      {hasMetrics ? (
        <>
          <span className={textClassName}>{percentage}% </span>
          <span className="text-fg-500">·</span>
          <span className={textClassName}> {usedRamMB}</span> /
        </>
      ) : (
        <>
          <span className="text-fg-500">n/a </span>
          <span className="text-fg-500">·</span>
        </>
      )}
      <span className="text-contrast-1"> {totalRamMB} </span> MB
    </span>
  )
}

// ---------- Generic column cell components ----------

export function IdCell({ getValue }: CellContext<SandboxWithMetrics, unknown>) {
  return (
    <div className="text-fg-500 truncate font-mono text-xs">
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
      onClick={() => {
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

  return (
    <JsonPopover
      className="text-fg-500 hover:text-fg hover:underline"
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
      <span className="text-fg-500">{`${day} ${date} ${month} ${year}`}</span>{' '}
      <span className="text-fg">{time}</span>{' '}
      <span className="text-fg-500">{timezone}</span>
    </div>
  )
}
