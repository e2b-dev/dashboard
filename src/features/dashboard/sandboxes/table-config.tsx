/* eslint-disable react-hooks/rules-of-hooks */

'use client'

import { ArrowUpRight, Cpu } from 'lucide-react'
import { ColumnDef, FilterFn, useReactTable } from '@tanstack/react-table'
import { rankItem } from '@tanstack/match-sorter-utils'
import { Sandbox, Template } from '@/types/api'
import { Badge } from '@/ui/primitives/badge'
import { PROTECTED_URLS } from '@/configs/urls'
import { DateRange } from 'react-day-picker'
import { isWithinInterval } from 'date-fns'
import { CgSmartphoneRam } from 'react-icons/cg'
import { cn } from '@/lib/utils'
import { useMemo } from 'react'
import { Button } from '@/ui/primitives/button'
import { useRouter } from 'next/navigation'
import { useTemplateTableStore } from '../templates/stores/table-store'
import { useServerContext } from '@/lib/hooks/use-server-context'
import { JsonPopover } from '@/ui/json-popover'
import posthog from 'posthog-js'
import { logError } from '@/lib/clients/logger'
import { ClientSandboxMetric } from '@/types/sandboxes.types'

export type SandboxWithMetrics = Sandbox & { metrics: ClientSandboxMetric }
export type SandboxesTable = ReturnType<
  typeof useReactTable<SandboxWithMetrics>
>

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
  // try catch to avoid crash by serialization issues
  try {
    if (columnId === 'metadata') {
      const metadata = row.original.metadata

      if (!metadata) return false

      const stringifiedMetadata = JSON.stringify(metadata)

      return stringifiedMetadata.includes(value)
    }
  } catch (error) {
    logError('Error in fuzzyFilter', {
      error,
      row,
      columnId,
      value,
    })
    return false
  }

  const itemRank = rankItem(row.getValue(columnId), value)

  addMeta({ itemRank })

  return itemRank.passed
}

export const dateRangeFilter: FilterFn<SandboxWithMetrics> = (
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
  if (columnId === 'cpuCount') {
    const rowValue = row.original.cpuCount
    if (!rowValue || !value || value === 0) return true
    return rowValue === value
  }

  if (columnId === 'memoryMB') {
    const rowValue = row.original.memoryMB
    if (!rowValue || !value || value === 0) return true
    return rowValue === value
  }

  return true
}

// TABLE CONFIG

export const fallbackData: SandboxWithMetrics[] = []

export const COLUMNS: ColumnDef<SandboxWithMetrics>[] = [
  // FIXME: Currently disabled due to issues with url state management when sandboxes dissapear
  /*   {
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
  }, */
  {
    accessorFn: (row) => `${row?.sandboxID}-${row?.clientID}`,
    header: 'ID',
    cell: ({ getValue }) => (
      <div className="text-fg-500 truncate font-mono text-xs">
        {getValue() as string}
      </div>
    ),
    size: 300,
    minSize: 100,
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
      const template: Template | undefined = table
        .getState()
        // @ts-expect-error - templates state not in type definition
        .templates.find((t: Template) => t.templateID === templateId)

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
    },
    size: 250,
    minSize: 180,
    filterFn: 'arrIncludesSome',
    enableGlobalFilter: true,
  },
  {
    id: 'cpuUsage',
    accessorFn: (row) => row.metrics?.cpuUsedPct ?? 0,
    header: 'CPU Usage',
    cell: ({ getValue, row }) => {
      const cpuPercentage = getValue() as number
      const hasMetrics = row.original.metrics != null

      const textClassName = cn(
        cpuPercentage >= 80
          ? 'text-error'
          : cpuPercentage >= 50
            ? 'text-warning'
            : 'text-success'
      )

      return (
        <span
          className={cn(
            'text-fg-500 flex items-center gap-1 truncate font-mono whitespace-nowrap'
          )}
        >
          {hasMetrics ? (
            <span className={cn('flex items-center gap-1', textClassName)}>
              {`${cpuPercentage.toFixed(0)}%`}
            </span>
          ) : (
            'N/A'
          )}
          <span className="text-fg-500 mx-1">·</span>
          <span className="text-contrast-2">{row.original.cpuCount}</span> Core
          {row.original.cpuCount > 1 ? 's' : ''}
        </span>
      )
    },
    size: 175,
    minSize: 120,
    // @ts-expect-error resourceRange is not a valid filterFn
    filterFn: 'resourceRange',
  },
  {
    id: 'ramUsage',
    accessorFn: (row) => {
      if (!row.metrics?.memUsedMb || !row.metrics?.memTotalMb) return 0
      return (row.metrics?.memUsedMb / row.metrics?.memTotalMb) * 100
    },
    header: 'Memory Usage',
    cell: ({ getValue, row }) => {
      const ramPercentage = getValue() as number
      const hasMetrics =
        row.original.metrics != null && row.original.metrics.memUsedMb != null

      const totalRamMB = row.original.memoryMB.toLocaleString()

      const textClassName = useMemo(() => {
        return cn(
          ramPercentage >= 80
            ? 'text-error'
            : ramPercentage >= 50
              ? 'text-warning'
              : 'text-success'
        )
      }, [ramPercentage])

      const usedRamMB = hasMetrics
        ? row.original.metrics.memUsedMb.toLocaleString()
        : '0'

      return (
        <span
          className={cn(
            'text-fg-500 flex items-center gap-1 truncate font-mono whitespace-nowrap'
          )}
        >
          {hasMetrics ? (
            <span className={cn('flex items-center gap-1', textClassName)}>
              {`${ramPercentage.toFixed(0)}%`}
            </span>
          ) : (
            'N/A'
          )}
          <span className="text-fg-500 mx-1">·</span>
          <span className={textClassName}>{usedRamMB}</span> /{' '}
          <span className="text-contrast-1">{totalRamMB}</span> MB
        </span>
      )
    },
    size: 175,
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

      return (
        <JsonPopover
          className="text-fg-500 hover:text-fg hover:underline"
          json={json}
        >
          {value}
        </JsonPopover>
      )
    },
    filterFn: 'includesStringSensitive',
    enableGlobalFilter: true,
    size: 200,
    minSize: 160,
  },
  {
    id: 'startedAt',
    accessorKey: 'startedAt',
    header: 'Started At',
    cell: ({ row, getValue }) => {
      const dateValue = getValue() as string

      const dateTimeString = useMemo(() => {
        return new Date(dateValue).toUTCString()
      }, [dateValue])

      const [day, date, month, year, time, timezone] = useMemo(() => {
        return dateTimeString.split(' ')
      }, [dateTimeString])

      return (
        <div className={cn('h-full truncate font-mono text-xs')}>
          <span className="text-fg-500">{`${day} ${date} ${month} ${year}`}</span>{' '}
          <span className="text-fg">{time}</span>{' '}
          <span className="text-fg-500">{timezone}</span>
        </div>
      )
    },
    size: 250,
    minSize: 140,
    // @ts-expect-error dateRange is not a valid filterFn
    filterFn: 'dateRange',
    enableColumnFilter: true,
    enableGlobalFilter: false,
    sortingFn: (rowA, rowB) => {
      return rowA.original.startedAt.localeCompare(rowB.original.startedAt)
    },
  },
]
