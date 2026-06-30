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

// Builds arrive newest-first from the API and are never re-sorted client-side;
// this column carries the fixed default-sort (desc) indicator in the header.
export const DEFAULT_SORT_COLUMN_ID = 'createdAt'

// Extra left padding balances spacing between the left-aligned and right-aligned column groups.
export const ID_COLUMN_ID = 'id'

const RIGHT_ALIGNED_COLUMNS = new Set([
  'duration',
  'cpuCount',
  'memoryMB',
  'diskSizeMB',
  'envdVersion',
])

export const isRightAlignedColumn = (id: string) =>
  RIGHT_ALIGNED_COLUMNS.has(id)

export const buildsColumns: ColumnDef<ListedBuildModel>[] = [
  {
    accessorKey: 'status',
    header: 'Status',
    size: 76,
    enableResizing: false,
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
    size: 240,
    minSize: 160,
    maxSize: 480,
    enableResizing: true,
    cell: ({ row }) => (
      <Template
        template={row.original.template}
        templateId={row.original.templateId}
      />
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Started',
    size: 68,
    enableResizing: false,
    cell: ({ row }) => <StartedAt timestamp={row.original.createdAt} />,
  },
  {
    accessorKey: 'duration',
    header: 'Duration',
    size: 68,
    enableResizing: false,
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
  {
    accessorKey: 'id',
    header: 'ID',
    size: 128,
    enableResizing: false,
    cell: ({ row }) => <BuildId id={row.original.id} />,
  },
  {
    accessorKey: 'cpuCount',
    header: 'CPU',
    size: 64,
    enableResizing: false,
    cell: ({ row }) => <Cpu cpuCount={row.original.cpuCount} />,
  },
  {
    accessorKey: 'memoryMB',
    header: 'Memory',
    size: 80,
    enableResizing: false,
    cell: ({ row }) => <Memory memoryMB={row.original.memoryMB} />,
  },
  {
    accessorKey: 'diskSizeMB',
    header: 'Storage',
    size: 80,
    enableResizing: false,
    cell: ({ row }) => <Storage diskSizeMB={row.original.diskSizeMB} />,
  },
  {
    accessorKey: 'envdVersion',
    header: 'ENVD',
    size: 96,
    enableResizing: false,
    cell: ({ row }) => <Envd version={row.original.envdVersion} />,
  },
]

export const buildsTableConfig: Partial<TableOptions<ListedBuildModel>> = {
  getCoreRowModel: getCoreRowModel(),
  enableSorting: false,
  columnResizeMode: 'onChange',
  enableColumnResizing: true,
}
