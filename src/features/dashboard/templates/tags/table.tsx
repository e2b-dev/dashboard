'use client'

import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
  useSuspenseQuery,
} from '@tanstack/react-query'
import {
  flexRender,
  type OnChangeFn,
  type Row,
  type SortingState,
  type TableOptions,
  useReactTable,
} from '@tanstack/react-table'
import {
  type KeyboardEvent,
  type MouseEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { PROTECTED_URLS } from '@/configs/urls'
import type { TemplateTagAssignment } from '@/core/modules/templates/models'
import { LoadMoreButton } from '@/features/dashboard/templates/builds/table-cells'
import { getTemplateDisplayName } from '@/features/dashboard/templates/helpers'
import { useFilterChangeTracking } from '@/lib/hooks/use-filter-change-tracking'
import { cn } from '@/lib/utils/ui'
import { useTRPC } from '@/trpc/client'
import {
  DataTable,
  DataTableCell,
  DataTableHead,
  DataTableHeader,
  DataTableRow,
} from '@/ui/data-table'
import { HoverPrefetchLink } from '@/ui/hover-prefetch-link'
import { TriangleIcon } from '@/ui/primitives/icons'
import { Loader } from '@/ui/primitives/loader'
import { RowHoverFrame } from '@/ui/row-hover-frame'
import { TAGS_PAGE_LIMIT } from './constants'
import TagsEmpty from './empty'
import TagsHeader from './header'
import { TagHistoryRow } from './history/tag-history-row'
import RollbackTagDialog from './rollback-dialog'
import { useTagTableStore } from './stores/table-store'
import {
  fallbackData,
  getActiveTagSearch,
  hasInvalidTagSearchInput,
  sortingToServerSort,
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

  const sorting = useTagTableStore((s) => s.sorting)
  const setSorting = useTagTableStore((s) => s.setSorting)
  const globalFilter = useTagTableStore((s) => s.globalFilter)
  const expanded = useTagTableStore((s) => s.expanded)
  const setExpanded = useTagTableStore((s) => s.setExpanded)
  const resetFilters = useTagTableStore((s) => s.resetFilters)

  const handleSortingChange: OnChangeFn<SortingState> = useCallback(
    (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      trackTagTableInteraction('sorted', { column_count: next.length })
      setSorting(next)
    },
    [sorting, setSorting]
  )

  useEffect(() => {
    return () => resetFilters()
  }, [resetFilters])

  const activeSearch = useMemo(
    () => getActiveTagSearch(globalFilter),
    [globalFilter]
  )
  const serverSort = useMemo(() => sortingToServerSort(sorting), [sorting])
  const searchInvalid = hasInvalidTagSearchInput(globalFilter)

  const {
    data: tagsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    isPending,
  } = useInfiniteQuery(
    trpc.templates.getTagGroups.infiniteQueryOptions(
      {
        teamSlug,
        templateId,
        limit: TAGS_PAGE_LIMIT,
        search: activeSearch,
        sort: serverSort,
      },
      {
        getNextPageParam: (page) => page.nextCursor ?? undefined,
        initialCursor: undefined,
        placeholderData: keepPreviousData,
        refetchOnWindowFocus: true,
      }
    )
  )

  const { data: countData } = useQuery(
    trpc.templates.getTagCount.queryOptions(
      { teamSlug, templateId },
      { staleTime: 30_000, refetchOnWindowFocus: false }
    )
  )

  const { isFilterRefetching, clearFilterRefetching } = useFilterChangeTracking(
    [activeSearch, serverSort]
  )
  useEffect(() => {
    if (!isFetching && isFilterRefetching) clearFilterRefetching()
  }, [isFetching, isFilterRefetching, clearFilterRefetching])

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
    () => getTemplateDisplayName(templateData.template),
    [templateData]
  )

  const groups = useMemo<TagGroup[]>(() => {
    const pages = tagsData?.pages ?? []
    const out: TagGroup[] = []
    for (const page of pages) {
      for (const group of page.tags) {
        const primaryAssignment = group.assignments[0]
        if (!primaryAssignment) continue
        out.push({
          tag: group.tag,
          primaryAssignment,
          assignments: group.assignments,
          hasMore: group.hasMore,
        })
      }
    }
    return out
  }, [tagsData])

  const columns = useTagColumns()

  const table = useReactTable<TagGroup>({
    ...tagsTableConfig,
    data: groups.length > 0 ? groups : fallbackData,
    columns,
    state: { sorting, expanded },
    onSortingChange: handleSortingChange,
    onExpandedChange: setExpanded,
    getRowCanExpand: (row) =>
      row.original.assignments.length > 1 || row.original.hasMore,
    meta: { teamSlug, templateId, templateName },
  } as TableOptions<TagGroup>)

  const rows = table.getRowModel().rows
  const hasData = groups.length > 0
  const showLoader = isPending && !hasData
  const showEmpty = !isPending && !isFetching && !hasData
  const showFilterRefetchingOverlay = isFilterRefetching && hasData

  const handleLoadMore = useCallback(() => {
    fetchNextPage()
    trackTagTableInteraction('page_fetched', {
      has_search: activeSearch !== undefined,
      sort: serverSort,
    })
  }, [fetchNextPage, activeSearch, serverSort])

  return (
    <div className="flex flex-col gap-6 h-full min-h-0">
      <TagsHeader
        teamSlug={teamSlug}
        templateId={templateId}
        templateName={templateName}
        total={countData?.total}
        hasSearch={activeSearch !== undefined}
        searchInvalid={searchInvalid}
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

          {showLoader && (
            <div className="h-[35svh] w-full flex items-center justify-center">
              <Loader variant="slash" size="lg" />
            </div>
          )}

          {showEmpty && <TagsEmpty hasSearch={activeSearch !== undefined} />}

          {hasData && (
            <div
              className={cn(
                'flex flex-col divide-y divide-stroke/80',
                showFilterRefetchingOverlay && 'opacity-70 transition-opacity'
              )}
            >
              {rows.map((row) => (
                <GroupSection
                  key={row.id}
                  row={row}
                  teamSlug={teamSlug}
                  templateId={templateId}
                  templateName={templateName}
                />
              ))}
            </div>
          )}

          {hasNextPage && (
            <div className="flex w-full items-center justify-center py-3">
              <LoadMoreButton
                isLoading={isFetchingNextPage}
                onLoadMore={handleLoadMore}
              />
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
  templateName: string
}

function GroupSection({
  row,
  teamSlug,
  templateId,
  templateName,
}: GroupSectionProps) {
  'use no memo'

  const canExpand = row.getCanExpand()
  const isExpanded = row.getIsExpanded()
  const dataState = isExpanded ? 'open' : 'closed'

  const [rollbackRequest, setRollbackRequest] = useState<{
    target: TemplateTagAssignment
    currentBuildId: string
  } | null>(null)

  const handleRequestRowRollback = useCallback(
    (target: TemplateTagAssignment) => {
      setRollbackRequest({
        target,
        currentBuildId: row.original.primaryAssignment.buildId,
      })
    },
    [row.original.primaryAssignment.buildId]
  )

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
    <div className="group/section flex flex-col divide-y divide-stroke/80">
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
            <TagHistoryRow
              key={assignment.assignmentId}
              assignment={assignment}
              primaryAssignment={row.original.primaryAssignment}
              teamSlug={teamSlug}
              templateId={templateId}
              onRequestRollback={handleRequestRowRollback}
            />
          ))}
          {row.original.hasMore && (
            <ShowFullHistoryRow
              tag={row.original.tag}
              teamSlug={teamSlug}
              templateId={templateId}
            />
          )}
        </div>
      )}

      <RollbackTagDialog
        open={rollbackRequest !== null}
        onOpenChange={(next) => {
          if (!next) setRollbackRequest(null)
        }}
        tag={row.original.tag}
        currentBuildId={rollbackRequest?.currentBuildId ?? ''}
        targetBuildId={rollbackRequest?.target.buildId ?? ''}
        teamSlug={teamSlug}
        templateId={templateId}
        templateName={templateName}
        surface="history-row"
      />
    </div>
  )
}

interface ShowFullHistoryRowProps {
  tag: string
  teamSlug: string
  templateId: string
}

function ShowFullHistoryRow({
  tag,
  teamSlug,
  templateId,
}: ShowFullHistoryRowProps) {
  return (
    <HoverPrefetchLink
      href={PROTECTED_URLS.TEMPLATE_TAG_HISTORY(teamSlug, templateId, tag)}
      onClick={() =>
        trackTagTableInteraction('show_full_history_clicked', { tag })
      }
      className={cn(
        'flex w-full items-center justify-center bg-bg py-2 cursor-pointer',
        'prose-body-highlight text-fg-tertiary hover:text-fg transition-colors'
      )}
    >
      Show full history
    </HoverPrefetchLink>
  )
}
