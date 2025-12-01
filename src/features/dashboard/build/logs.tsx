'use client'

import type { BuildLogDTO } from '@/server/api/models/builds.models'
import { useTRPC } from '@/trpc/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/ui/primitives/table'
import { useQuery } from '@tanstack/react-query'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { use, useMemo, useRef } from 'react'

// TABLE CONFIG

const ROW_HEIGHT_PX = 32

const columnHelper = createColumnHelper<BuildLogDTO>()

const COLUMNS = [
  columnHelper.accessor((row) => row.timestamp, {
    id: 'timestamp',
    cell: (info) => <span>{info.getValue()}</span>,
    size: 12,
    maxSize: 12,
  }),
  columnHelper.accessor((row) => row.level, {
    id: 'level',
    cell: (info) => <span>{info.getValue()}</span>,
    maxSize: 54,
  }),
  columnHelper.accessor((row) => row.message, {
    id: 'message',
    cell: (info) => <span>{info.getValue()}</span>,
  }),
]

const defaultData: BuildLogDTO[] = []

// LOGS VIEWER

interface LogsProps {
  params: PageProps<'/dashboard/[teamIdOrSlug]/templates/[templateId]/builds/[buildId]'>['params']
}

export default function Logs({ params }: LogsProps) {
  'use no memo'

  const { teamIdOrSlug, templateId, buildId } = use(params)
  const trpc = useTRPC()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const { data: buildDetails, isLoading: isBuildDetailsLoading } = useQuery(
    trpc.builds.buildDetails.queryOptions({
      teamIdOrSlug,
      templateId,
      buildId,
    })
  )

  const logsData = useMemo(
    () => buildDetails?.logs ?? null,
    [buildDetails?.logs]
  )

  const table = useReactTable({
    columns: COLUMNS,
    data: logsData ?? defaultData,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden relative">
      <div
        ref={scrollContainerRef}
        className="min-h-0 flex-1 overflow-y-auto overflow-x-auto md:overflow-x-hidden"
      >
        <Table>
          <TableHeader className="sticky top-0 z-10 bg-bg border-b">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    {...{
                      colSpan: header.colSpan,
                      style: {
                        width: header.getSize(),
                      },
                    }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                style={{
                  height: ROW_HEIGHT_PX,
                }}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell
                    key={cell.id}
                    className="py-0"
                    style={{
                      width: cell.column.getSize(),
                    }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
