'use client'

import {
  type ColumnDef,
  getCoreRowModel,
  type TableOptions,
} from '@tanstack/react-table'
import type { ListedBuildModel } from '@/core/modules/builds/models'
import {
  BuildId,
  Cpu,
  Duration,
  Envd,
  Memory,
  StartedAt,
  Status,
  Storage,
  Template,
} from './table-cells'

export const fallbackData: ListedBuildModel[] = []

const RIGHT_ALIGNED_COLUMNS = new Set([
  'cpuCount',
  'memoryMB',
  'diskSizeMB',
  'envdVersion',
  'createdAt',
  'duration',
])

export const isRightAlignedColumn = (id: string) =>
  RIGHT_ALIGNED_COLUMNS.has(id)

// Flex behavior per column, applied to both header and body cells. Columns are
// fixed-width by default (shrink-0 → horizontal scroll); Template grows to fill
// the leftover space.
const COLUMN_CLASSNAMES: Record<string, string> = {
  template: 'flex-1 min-w-[160px]',
}

export const columnClassName = (id: string) =>
  COLUMN_CLASSNAMES[id] ?? 'shrink-0'

export const buildsColumns: ColumnDef<ListedBuildModel>[] = [
  {
    accessorKey: 'status',
    header: 'Status',
    size: 76,
    cell: ({ row }) => (
      <Status
        status={row.original.status}
        statusMessage={row.original.statusMessage}
      />
    ),
  },
  {
    accessorKey: 'template',
    header: 'Template',
    size: 160,
    cell: ({ row }) => (
      <Template
        template={row.original.template}
        templateId={row.original.templateId}
      />
    ),
  },
  {
    accessorKey: 'id',
    header: 'ID',
    size: 128,
    cell: ({ row }) => <BuildId id={row.original.id} />,
  },
  {
    accessorKey: 'cpuCount',
    header: 'CPU',
    size: 64,
    cell: ({ row }) => <Cpu cpuCount={row.original.cpuCount} />,
  },
  {
    accessorKey: 'memoryMB',
    header: 'Memory',
    size: 80,
    cell: ({ row }) => <Memory memoryMB={row.original.memoryMB} />,
  },
  {
    accessorKey: 'diskSizeMB',
    header: 'Storage',
    size: 80,
    cell: ({ row }) => <Storage diskSizeMB={row.original.diskSizeMB} />,
  },
  {
    accessorKey: 'envdVersion',
    header: 'ENVD Ver.',
    size: 96,
    cell: ({ row }) => <Envd version={row.original.envdVersion} />,
  },
  {
    accessorKey: 'createdAt',
    header: 'Started',
    size: 110,
    cell: ({ row }) => <StartedAt timestamp={row.original.createdAt} />,
  },
  {
    accessorKey: 'duration',
    header: 'Duration',
    size: 110,
    cell: ({ row }) => (
      <div className="w-full text-end">
        <Duration
          createdAt={row.original.createdAt}
          finishedAt={row.original.finishedAt}
          isBuilding={row.original.status === 'building'}
        />
      </div>
    ),
  },
]

export const buildsTableConfig: Partial<TableOptions<ListedBuildModel>> = {
  getCoreRowModel: getCoreRowModel(),
  enableSorting: false,
  enableColumnResizing: false,
}
