'use client'

import { useSuspenseQuery } from '@tanstack/react-query'
import {
  flexRender,
  type Row,
  type TableOptions,
  useReactTable,
} from '@tanstack/react-table'
import { type KeyboardEvent, type MouseEvent, useMemo } from 'react'
import type { TemplateTagAssignment } from '@/core/modules/templates/models'
import { defaultErrorToast, useToast } from '@/lib/hooks/use-toast'
import { cn } from '@/lib/utils/ui'
import { useTRPC } from '@/trpc/client'
import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from '@/ui/data-table'
import { TriangleIcon, UndoIcon } from '@/ui/primitives/icons'
import { RowHoverFrame } from '@/ui/row-hover-frame'
import { BuildLink } from './build-link'
import TagsEmpty from './empty'
import TagsHeader from './header'
import { useTagTableStore } from './stores/table-store'
import {
  fallbackData,
  tagsTableConfig,
  trackTagTableInteraction,
  useTagColumns,
} from './table-config'
import type { TagGroup } from './types'

interface TagsTableProps {
  teamSlug: string
  templateId: string
}

export default function TagsTable({ teamSlug, templateId }: TagsTableProps) {
  'use no memo'

  const trpc = useTRPC()

  const { data: tagsData } = useSuspenseQuery(
    trpc.templates.getTagGroups.queryOptions(
      { teamSlug, templateId },
      {
        refetchOnMount: false,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      }
    )
  )

  const { data: templateData } = useSuspenseQuery(
    trpc.templates.getTemplate.queryOptions(
      { teamSlug, templateId },
      {
        refetchOnMount: false,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
      }
    )
  )

  const templateName = useMemo(
    () =>
      templateData.template.names.find((n) => !n.includes('/')) ??
      templateData.template.names[0] ??
      templateData.template.templateID,
    [templateData]
  )

  const groups = useMemo<TagGroup[]>(
    () =>
      tagsData.tags.flatMap((group) => {
        const primaryAssignment = group.assignments[0]
        if (!primaryAssignment) return []

        return [
          {
            tag: group.tag,
            primaryAssignment,
            assignments: group.assignments,
            hasMore: group.hasMore,
          },
        ]
      }),
    [tagsData.tags]
  )

  const sorting = useTagTableStore((s) => s.sorting)
  const setSorting = useTagTableStore((s) => s.setSorting)
  const globalFilter = useTagTableStore((s) => s.globalFilter)
  const setGlobalFilter = useTagTableStore((s) => s.setGlobalFilter)
  const expanded = useTagTableStore((s) => s.expanded)
  const setExpanded = useTagTableStore((s) => s.setExpanded)

  const columns = useTagColumns()

  const table = useReactTable<TagGroup>({
    ...tagsTableConfig,
    data: groups ?? fallbackData,
    columns,
    state: { sorting, globalFilter, expanded },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onExpandedChange: setExpanded,
    getRowCanExpand: (row) =>
      row.original.assignments.length > 1 || row.original.hasMore,
    meta: { teamSlug, templateId, templateName },
  } as TableOptions<TagGroup>)

  const rows = table.getRowModel().rows

  return (
    <div className="flex flex-col gap-6 h-full min-h-0">
      <TagsHeader
        table={table}
        teamSlug={teamSlug}
        templateId={templateId}
        templateName={templateName}
      />
      <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden -mx-8 px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <DataTable className="w-full">
          <DataTableHeader className="sticky top-0 z-10 bg-bg border-b-0 mb-px">
            {table.getHeaderGroups().map((headerGroup) => (
              <DataTableRow
                key={headerGroup.id}
                className="border-b-0 flex items-center gap-6 -mx-8 px-8 w-[calc(100%+64px)]"
              >
                {headerGroup.headers.map((header) => (
                  <DataTableHead
                    key={header.id}
                    header={header}
                    sorting={sorting.find((s) => s.id === header.id)?.desc}
                    align={header.id === 'actions' ? 'right' : 'left'}
                    className={cn(
                      'h-auto px-0',
                      header.id === 'tag' && 'flex-1 min-w-0',
                      header.id === 'assignedAt' && 'w-[178px] shrink-0',
                      header.id === 'actions' &&
                        'w-[203px] max-sm:w-4 shrink-0 justify-end'
                    )}
                    style={
                      header.id === 'tag' ? undefined : { width: undefined }
                    }
                  >
                    <span>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </span>
                  </DataTableHead>
                ))}
              </DataTableRow>
            ))}
          </DataTableHeader>

          {rows.length === 0 ? (
            <TagsEmpty hasSearch={globalFilter.trim().length > 0} />
          ) : (
            <div className="flex flex-col divide-y divide-stroke/80">
              {rows.map((row) => (
                <GroupSection
                  key={row.id}
                  row={row}
                  teamSlug={teamSlug}
                  templateId={templateId}
                />
              ))}
            </div>
          )}
        </DataTable>
      </div>
    </div>
  )
}

interface GroupSectionProps {
  row: Row<TagGroup>
  teamSlug: string
  templateId: string
}

function GroupSection({ row, teamSlug, templateId }: GroupSectionProps) {
  'use no memo'

  const canExpand = row.getCanExpand()
  const isExpanded = row.getIsExpanded()
  const dataState = isExpanded ? 'open' : 'closed'

  const toggle = () => {
    row.toggleExpanded()
    trackTagTableInteraction('expanded', {
      tag: row.original.tag,
      next: !isExpanded,
    })
  }

  const handleClick = canExpand
    ? (e: MouseEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement | null
        if (target?.closest('button, a, [role=button]') !== e.currentTarget) {
          return
        }
        toggle()
      }
    : undefined
  const handleKeyDown = canExpand
    ? (e: KeyboardEvent<HTMLDivElement>) => {
        if (e.currentTarget !== e.target) return
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          toggle()
        }
      }
    : undefined

  return (
    <div className="flex flex-col divide-y divide-stroke/80">
      <DataTableRow
        data-state={dataState}
        role={canExpand ? 'button' : undefined}
        tabIndex={canExpand ? 0 : undefined}
        aria-expanded={canExpand ? isExpanded : undefined}
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          'group/row relative flex items-center gap-6 border-b-0 -mx-3 px-3 w-[calc(100%+24px)]',
          canExpand && 'cursor-pointer'
        )}
      >
        {canExpand && (
          // increase hit box size
          <span
            aria-hidden
            className={cn(
              'flex absolute -left-6 top-1/2 -translate-y-1/2',
              'size-6 items-center justify-center cursor-pointer',
              isExpanded
                ? 'opacity-100'
                : 'opacity-0 group-hover/row:opacity-100'
            )}
          >
            <TriangleIcon
              className={cn(
                'size-4 transition-[transform,color]',
                isExpanded && 'rotate-90',
                'text-fg-tertiary',
                'group-hover/row:text-fg',
                'group-focus-visible/row:text-fg'
              )}
            />
          </span>
        )}

        {row.getVisibleCells().map((cell) => (
          <DataTableCell
            key={cell.id}
            cell={cell}
            className={cn(
              'py-2',
              cell.column.id === 'tag' && 'flex-1 min-w-0',
              cell.column.id === 'assignedAt' && 'w-[178px] shrink-0',
              cell.column.id === 'actions' &&
                'w-[203px] max-sm:w-4 shrink-0 justify-end'
            )}
            style={{ width: undefined }}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </DataTableCell>
        ))}

        <RowHoverFrame
          className={cn(
            'group-has-[button[aria-haspopup=menu][data-state=open]]/row:border-stroke',
            'group-has-[button[aria-haspopup=menu][data-state=open]]/row:[--corner-mark-color:var(--color-fg-tertiary)]',
            'group-data-[state=open]/row:hidden'
          )}
        />
      </DataTableRow>

      {isExpanded && (
        <div className="flex flex-col divide-y divide-stroke/80">
          {row.original.assignments.slice(1).map((assignment) => (
            <HistoryBuildRow
              key={assignment.assignmentId}
              assignment={assignment}
              teamSlug={teamSlug}
              templateId={templateId}
            />
          ))}
          {row.original.hasMore && <ShowFullHistoryRow />}
        </div>
      )}
    </div>
  )
}

interface HistoryBuildRowProps {
  assignment: TemplateTagAssignment
  teamSlug: string
  templateId: string
}

function HistoryBuildRow({
  assignment,
  teamSlug,
  templateId,
}: HistoryBuildRowProps) {
  'use no memo'

  const { toast } = useToast()

  const rollback = () => {
    toast(defaultErrorToast('Rollback to this build: not implemented yet'))
  }

  const handleClick = (e: MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement | null
    if (target?.closest('button, a, [role=button]') !== e.currentTarget) {
      return
    }
    rollback()
  }
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.currentTarget !== e.target) return
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      rollback()
    }
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: The row contains nested links, so a button would be invalid HTML.
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        'group/childRow flex w-full items-center justify-between gap-4',
        'bg-bg py-2 cursor-pointer',
        'focus-visible:outline-none'
      )}
    >
      <div className="flex items-center gap-2 prose-body text-fg-tertiary">
        <span>Assigned to</span>
        <BuildLink
          teamSlug={teamSlug}
          templateId={templateId}
          buildId={assignment.buildId}
          assignedAt={assignment.assignedAt}
        />
      </div>
      <span
        aria-hidden
        className={cn(
          'inline-flex items-center gap-1',
          'prose-body-highlight text-fg',
          'opacity-0 group-hover/childRow:opacity-100 group-focus-visible/childRow:opacity-100',
          'group-has-[a:hover]/childRow:opacity-0',
          '[&_svg]:size-4 [&_svg]:text-icon-tertiary'
        )}
      >
        <UndoIcon />
        Rollback to this build
      </span>
    </div>
  )
}

function ShowFullHistoryRow() {
  const { toast } = useToast()

  return (
    <button
      type="button"
      onClick={() =>
        toast(defaultErrorToast('Show full history: not implemented yet'))
      }
      className={cn(
        'flex w-full items-center justify-center bg-bg py-2 cursor-pointer',
        'prose-body-highlight text-fg-tertiary hover:text-fg transition-colors'
      )}
    >
      Show full history
    </button>
  )
}
