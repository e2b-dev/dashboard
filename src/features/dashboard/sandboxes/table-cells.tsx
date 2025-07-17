'use client'

import React, { useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  ClientSandboxesMetrics,
  ClientSandboxMetric,
} from '@/types/sandboxes.types'
import { CellContext } from '@tanstack/react-table'
import { SandboxWithMetrics } from './table-config'
import { Button } from '@/ui/primitives/button'
import { ArrowUpRight } from 'lucide-react'
import { Template } from '@/types/api'
import { useRouter } from 'next/navigation'
import { useServerContext } from '@/lib/hooks/use-server-context'
import { PROTECTED_URLS } from '@/configs/urls'
import { useTemplateTableStore } from '../templates/stores/table-store'
import { JsonPopover } from '@/ui/json-popover'

declare module '@tanstack/react-table' {
  interface TableState {
    templates?: Template[]
    metrics?: ClientSandboxesMetrics
  }
}

interface CpuUsageCellProps {
  metrics?: ClientSandboxMetric | null
  cpuCount: number | null
}

export const CpuUsageCell = React.memo<CpuUsageCellProps>(
  function CpuUsageCell({ metrics, cpuCount }) {
    const cpuRaw = metrics?.cpuUsedPct ?? 0
    const cpuPercentage = Math.round(cpuRaw)
    const hasMetrics = metrics !== null && metrics !== undefined

    const textClassName = cn(
      cpuPercentage >= 90
        ? 'text-error'
        : cpuPercentage >= 70
          ? 'text-warning'
          : 'text-fg'
    )

    return (
      <span
        className={cn(
          'text-fg-500 inline w-full truncate font-mono whitespace-nowrap'
        )}
      >
        {hasMetrics ? (
          <span className={textClassName}>{cpuPercentage}% </span>
        ) : (
          <span>n/a</span>
        )}
        <span className="text-fg-500 mx-2">·</span>
        <span className="text-contrast-2">{cpuCount ?? '-'}</span>&nbsp;Core
        {cpuCount && cpuCount > 1 ? 's' : ''}
      </span>
    )
  },
  (prev, next) =>
    prev.metrics?.cpuUsedPct === next.metrics?.cpuUsedPct &&
    prev.cpuCount === next.cpuCount
)

interface RamUsageCellProps {
  metrics?: ClientSandboxMetric | null
  memoryMB: number
}

export const RamUsageCell = React.memo<RamUsageCellProps>(
  function RamUsageCell({ metrics, memoryMB }) {
    let percentage = 0
    if (metrics?.memUsedMb && metrics.memTotalMb) {
      percentage = (metrics.memUsedMb / metrics.memTotalMb) * 100
    }
    const ramPercentage = Math.round(percentage)
    const hasMetrics = metrics !== null && metrics !== undefined

    const totalRamMB = memoryMB.toLocaleString()

    const textClassName = cn(
      ramPercentage >= 95
        ? 'text-error'
        : ramPercentage >= 70
          ? 'text-warning'
          : 'text-fg'
    )

    const usedRamMB = hasMetrics ? metrics!.memUsedMb.toLocaleString() : 'n/a'

    return (
      <span
        className={cn(
          'text-fg-500 inline truncate font-mono whitespace-nowrap'
        )}
      >
        {hasMetrics ? (
          <>
            <span className={textClassName}>{ramPercentage}% </span>
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
  },
  (prev, next) => {
    const equal =
      prev.metrics?.memUsedMb === next.metrics?.memUsedMb &&
      prev.metrics?.memTotalMb === next.metrics?.memTotalMb &&
      prev.memoryMB === next.memoryMB
    return equal
  }
)

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
