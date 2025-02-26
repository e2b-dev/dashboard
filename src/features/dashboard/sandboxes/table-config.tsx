/* eslint-disable react-hooks/rules-of-hooks */

'use client'

import { ArrowUpRight, Cpu, PinIcon, X } from 'lucide-react'
import { ColumnDef, FilterFn } from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'
import { Sandbox, SandboxMetrics } from '@/types/api'
import { Badge, badgeVariants } from '@/ui/primitives/badge'
import { PROTECTED_URLS } from '@/configs/urls'
import { DateRange } from 'react-day-picker'
import { isWithinInterval } from 'date-fns'
import { VariantProps } from 'class-variance-authority'
import { CgSmartphoneRam } from 'react-icons/cg'
import { cn } from '@/lib/utils'
import { useMemo } from 'react'
import { Button } from '@/ui/primitives/button'
import { useRouter } from 'next/navigation'
import { useTemplateTableStore } from '../templates/stores/table-store'
import { useServerContext } from '@/lib/hooks/use-server-context'
import { JsonPopover } from '@/ui/json-popover'
import posthog from 'posthog-js'

export type SandboxWithMetrics = Sandbox & { metrics: SandboxMetrics[] }

export const trackTableInteraction = (
  action: string,
  properties: Record<string, unknown> = {}
) => {
  posthog.capture('sandbox table interacted', {
    action,
    ...properties,
  })
}

// FILTERS

export const fuzzyFilter: FilterFn<SandboxWithMetrics> = (
  row,
  columnId,
  value,
  addMeta
) => {
  const itemRank = rankItem(row.getValue(columnId), value)

  addMeta({ itemRank })

  return itemRank.passed
}

export const dateRangeFilter: FilterFn<Sandbox> = (
  row,
  columnId,
  value: DateRange,
  addMeta
) => {
  const startedAt = row.getValue(columnId) as string

  if (!startedAt) return false

  const startedAtDate = new Date(startedAt)

  if (!value.from || !value.to) return true

  return isWithinInterval(startedAtDate, {
    start: value.from,
    end: value.to,
  })
}

export const resourceRangeFilter: FilterFn<SandboxWithMetrics> = (
  row,
  columnId,
  value: number
) => {
  if (columnId === 'cpuUsage') {
    const rowValue = row.original.cpuCount
    if (!rowValue || !value || value === 0) return true
    return rowValue === value
  }

  if (columnId === 'ramUsage') {
    const rowValue = row.original.memoryMB
    if (!rowValue || !value || value === 0) return true
    return rowValue === value
  }

  return true
}

// TABLE CONFIG

export const fallbackData: SandboxWithMetrics[] = []

export const COLUMNS: ColumnDef<SandboxWithMetrics>[] = [
  {
    id: 'pin',
    cell: ({ row }) => (
      <Button
        variant="ghost"
        size="icon"
        className="text-fg-500 size-5"
        onClick={() => row.pin(row.getIsPinned() ? false : 'top')}
      >
        {row.getIsPinned() ? (
          <X className="size-3" />
        ) : (
          <PinIcon className="size-3" />
        )}
      </Button>
    ),
    size: 35,
    enableResizing: false,
    enableColumnFilter: false,
  },
  {
    accessorKey: 'sandboxID',
    header: 'ID',
    cell: ({ row }) => (
      <div className="text-fg-500 truncate font-mono text-xs">
        {row.getValue('sandboxID')}
      </div>
    ),
    size: 160,
    minSize: 160,
    enableColumnFilter: false,
    enableSorting: false,
    enableGlobalFilter: true,
  },
  {
    accessorKey: 'templateID',
    id: 'template',
    header: 'TEMPLATE',
    cell: ({ getValue, table }) => {
      const templateId = getValue() as string

      const { selectedTeamSlug, selectedTeamId } = useServerContext()

      const router = useRouter()

      if (!selectedTeamSlug || !selectedTeamId) return null

      return (
        <Button
          variant="link"
          className="text-fg h-auto p-0 text-xs"
          onClick={() => {
            useTemplateTableStore.getState().setGlobalFilter(templateId)
            router.push(
              PROTECTED_URLS.TEMPLATES(selectedTeamSlug ?? selectedTeamId)
            )
          }}
        >
          {templateId}
          <ArrowUpRight className="size-3" />
        </Button>
      )
    },
    size: 250,
    minSize: 180,
    filterFn: 'arrIncludesSome',
  },
  {
    id: 'cpuUsage',
    accessorFn: (row) => row.metrics[0]?.cpuUsedPct ?? 0,
    header: 'CPU Usage',
    cell: ({ getValue, row }) => {
      const cpu = getValue() as number

      const getVariant = (
        value: number
      ): VariantProps<typeof badgeVariants>['variant'] => {
        if (value >= 80) return 'error'
        if (value >= 50) return 'warning'
        return 'success'
      }

      return (
        <Badge
          variant={getVariant(cpu)}
          className="font-mono whitespace-nowrap"
        >
          <Cpu className="size-2" /> {cpu.toFixed(0)}% · {row.original.cpuCount}{' '}
          core{row.original.cpuCount > 1 ? 's' : ''}
        </Badge>
      )
    },
    size: 170,
    minSize: 170,
    // @ts-expect-error resourceRange is not a valid filterFn
    filterFn: 'resourceRange',
  },
  {
    id: 'ramUsage',
    accessorFn: (row) => {
      if (!row.metrics[0]?.memUsedMiB || !row.metrics[0]?.memTotalMiB) return 0
      return (row.metrics[0]?.memUsedMiB / row.metrics[0]?.memTotalMiB) * 100
    },
    header: 'RAM Usage',
    cell: ({ getValue, row }) => {
      const ramPercentage = getValue() as number

      const totalRamMB = row.original.memoryMB

      // Convert MiB to MB
      const usedRamMB = Math.round(row.original.metrics[0]?.memUsedMiB / 0.945)

      const getVariant = (
        percentage: number
      ): VariantProps<typeof badgeVariants>['variant'] => {
        if (percentage >= 80) return 'error'
        if (percentage >= 50) return 'warning'
        return 'success'
      }

      return (
        <Badge
          variant={getVariant(ramPercentage)}
          className="font-mono whitespace-nowrap"
        >
          <CgSmartphoneRam className="size-2" /> {usedRamMB.toLocaleString()}/
          {totalRamMB.toLocaleString()} MB
        </Badge>
      )
    },
    size: 160,
    minSize: 160,
    // @ts-expect-error resourceRange is not a valid filterFn
    filterFn: 'resourceRange',
  },
  {
    id: 'metadata',
    accessorFn: (row) => JSON.stringify(row.metadata ?? {}),
    header: 'Metadata',
    cell: ({ getValue }) => {
      const value = getValue() as string
      const json = useMemo(() => JSON.parse(value), [value])

      return <JsonPopover json={json}>{value}</JsonPopover>
    },
    size: 200,
    minSize: 160,
    enableGlobalFilter: false,
  },
  {
    id: 'startedAt',
    accessorFn: (row) => new Date(row.startedAt).toUTCString(),
    header: 'Started At',
    cell: ({ row, getValue }) => {
      return (
        <div
          className={cn(
            'text-fg-500 hover:text-fg h-full truncate font-mono text-xs'
          )}
        >
          {getValue() as string}
        </div>
      )
    },
    size: 250,
    minSize: 140,
    // @ts-expect-error dateRange is not a valid filterFn
    filterFn: 'dateRange',
    enableColumnFilter: true,
  },
]
