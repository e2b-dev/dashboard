/* eslint-disable react-hooks/rules-of-hooks */

'use client'

import { PROTECTED_URLS } from '@/configs/urls'
import { l } from '@/lib/clients/logger'
import { useServerContext } from '@/lib/hooks/use-server-context'
import { cn } from '@/lib/utils'
import { Sandbox, SandboxMetrics, Template } from '@/types/api'
import { JsonPopover } from '@/ui/json-popover'
import { Badge } from '@/ui/primitives/badge'
import { Button } from '@/ui/primitives/button'
import { rankItem } from '@tanstack/match-sorter-utils'
import { ColumnDef, FilterFn } from '@tanstack/react-table'
import { isWithinInterval } from 'date-fns'
import { ArrowUpRight, Cpu } from 'lucide-react'
import { useRouter } from 'next/navigation'
import posthog from 'posthog-js'
import { useMemo } from 'react'
import { DateRange } from 'react-day-picker'
import { CgSmartphoneRam } from 'react-icons/cg'
import { useTemplateTableStore } from '../templates/stores/table-store'

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

export const fuzzyFilter: FilterFn<Sandbox> = (
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
    l.error('SANDBOXES_TABLE:FUZZY_FILTER', error, {
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
  /* NOTE: Currently disabled due to issue with the metrics api
   if (columnId === 'cpuUsage') {
    const rowValue = row.original.cpuCount
    if (!rowValue || !value || value === 0) return true
    return rowValue === value
  }

  if (columnId === 'ramUsage') {
    const rowValue = row.original.memoryMB
    if (!rowValue || !value || value === 0) return true
    return rowValue === value
  } */

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

export const fallbackData: Sandbox[] = []

export const COLUMNS: ColumnDef<Sandbox>[] = [
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
    id: 'cpuCount',
    header: 'CPU Count',
    cell: ({ row }) => {
      const cpuCount = row.original.cpuCount

      return (
        <Badge className={cn('text-fg-500 px-0 font-mono whitespace-nowrap')}>
          <span className={cn('text-contrast-2 flex items-center gap-0.5')}>
            <Cpu className={cn('size-3')} /> {cpuCount}{' '}
          </span>{' '}
          core{cpuCount > 1 ? 's' : ''}
        </Badge>
      )
    },
    size: 130,
    minSize: 130,
    // @ts-expect-error resourceRange is not a valid filterFn
    filterFn: 'resourceRange',
    enableGlobalFilter: false,
  },
  {
    id: 'memoryMB',
    header: 'Memory',
    cell: ({ row }) => {
      const memoryMB = row.original.memoryMB
      return (
        <Badge className={cn('text-fg-500 px-0 font-mono whitespace-nowrap')}>
          <span className={cn('text-contrast-1 flex items-center gap-0.5')}>
            <CgSmartphoneRam className={cn('size-3')} /> {memoryMB}{' '}
          </span>{' '}
          MB
        </Badge>
      )
    },
    size: 105,
    minSize: 105,
    // @ts-expect-error resourceRange is not a valid filterFn
    filterFn: 'resourceRange',
    enableGlobalFilter: false,
  },
  // NOTE: Currently disabled due to issue with the metrics api
  /*   {
    id: 'cpuUsage',
    accessorFn: (row) => row.metrics[0]?.cpuUsedPct ?? 0,
    header: 'CPU Usage',
    cell: ({ getValue, row }) => {
      const cpu = getValue() as number

      const textClassName = cn(
        cpu >= 80 ? 'text-error' : cpu >= 50 ? 'text-warning' : 'text-success'
      )

      return (
        <Badge className={cn('font-mono whitespace-nowrap')}>
          <span className={cn('mr-1 flex items-center gap-1', textClassName)}>
            <Cpu className={cn('size-3', textClassName)} /> {cpu.toFixed(0)}%
          </span>{' '}
          · {row.original.cpuCount} core
          {row.original.cpuCount > 1 ? 's' : ''}
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

      // Convert MiB to MB - memoize this calculation
      const usedRamMB = useMemo(() => {
        return Math.round(row.original.metrics[0]?.memUsedMiB / 0.945)
      }, [row.original.metrics[0]?.memUsedMiB])

      // Memoize the text class name calculation
      const textClassName = useMemo(() => {
        return cn(
          ramPercentage >= 80
            ? 'text-error'
            : ramPercentage >= 50
              ? 'text-warning'
              : 'text-success'
        )
      }, [ramPercentage])

      // Memoize the badge content to prevent unnecessary re-renders
      const badgeContent = useMemo(() => {
        return (
          <>
            <span className={cn('flex items-center gap-1', textClassName)}>
              <CgSmartphoneRam className={cn('size-3', textClassName)} />{' '}
              {usedRamMB.toLocaleString()}
            </span>{' '}
            /{totalRamMB.toLocaleString()} MB
          </>
        )
      }, [textClassName, usedRamMB, totalRamMB])

      return (
        <Badge className={'gap-0 font-mono whitespace-nowrap'}>
          {badgeContent}
        </Badge>
      )
    },
    size: 160,
    minSize: 160,
    // @ts-expect-error resourceRange is not a valid filterFn
    filterFn: 'resourceRange',
  }, */
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
