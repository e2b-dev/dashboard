'use client'

import {
  keepPreviousData,
  useInfiniteQuery,
  useQueryClient,
  useSuspenseQuery,
} from '@tanstack/react-query'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PROTECTED_URLS } from '@/configs/urls'
import type { TemplateTagAssignment } from '@/core/modules/templates/models'
import { LoadMoreButton } from '@/features/dashboard/templates/builds/table-cells'
import { useTRPC } from '@/trpc/client'
import { Loader } from '@/ui/primitives/loader'
import RollbackTagDialog from '../rollback-dialog'
import { TagHistoryEmpty } from './tag-history-empty'
import { TagHistoryHeader } from './tag-history-header'
import { TagHistoryRow } from './tag-history-row'

interface TagHistoryViewProps {
  teamSlug: string
  templateId: string
  tag: string
}

const ROW_HEIGHT_PX = 36
const VIRTUAL_OVERSCAN = 12
const PREFETCH_THRESHOLD = 8

export default function TagHistoryView({
  teamSlug,
  templateId,
  tag,
}: TagHistoryViewProps) {
  'use no memo'

  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const router = useRouter()
  const scrollRef = useRef<HTMLDivElement>(null)

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

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    useInfiniteQuery(
      trpc.templates.getTagAssignments.infiniteQueryOptions(
        { teamSlug, templateId, tag, limit: 50 },
        {
          getNextPageParam: (page) => page.nextCursor ?? undefined,
          initialCursor: undefined,
          placeholderData: keepPreviousData,
          refetchOnWindowFocus: true,
        }
      )
    )

  const assignments = useMemo(
    () => data?.pages.flatMap((p) => p.data) ?? [],
    [data]
  )

  const primary = assignments[0]
  const previous = assignments[1]
  const history = useMemo(() => assignments.slice(1), [assignments])

  const virtualizer = useVirtualizer({
    count: history.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT_PX,
    overscan: VIRTUAL_OVERSCAN,
  })

  const virtualItems = virtualizer.getVirtualItems()
  const lastVisibleIndex = virtualItems[virtualItems.length - 1]?.index ?? -1

  useEffect(() => {
    if (
      hasNextPage &&
      !isFetchingNextPage &&
      lastVisibleIndex >= history.length - PREFETCH_THRESHOLD
    ) {
      fetchNextPage()
    }
  }, [
    hasNextPage,
    isFetchingNextPage,
    lastVisibleIndex,
    history.length,
    fetchNextPage,
  ])

  const handleTagDeleted = async () => {
    await queryClient.invalidateQueries({
      queryKey: trpc.templates.getTagAssignments.queryKey({
        teamSlug,
        templateId,
        tag,
      }),
    })
    router.push(PROTECTED_URLS.TEMPLATE_TAGS(teamSlug, templateId))
  }

  const handleRolledBack = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: trpc.templates.getTagAssignments.queryKey({
        teamSlug,
        templateId,
        tag,
      }),
    })
  }, [queryClient, trpc, teamSlug, templateId, tag])

  const [rollbackRequest, setRollbackRequest] = useState<{
    target: TemplateTagAssignment
    currentBuildId: string
  } | null>(null)

  const handleRequestRowRollback = useCallback(
    (target: TemplateTagAssignment) => {
      if (!primary) return
      setRollbackRequest({ target, currentBuildId: primary.buildId })
    },
    [primary]
  )

  if (isPending) {
    return (
      <div className="flex flex-1 items-center justify-center py-12">
        <Loader variant="slash" size="lg" />
      </div>
    )
  }

  if (!primary) {
    return <TagHistoryEmpty tag={tag} />
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <TagHistoryHeader
        tag={tag}
        teamSlug={teamSlug}
        templateId={templateId}
        templateName={templateName}
        primaryAssignment={primary}
        previousAssignment={previous}
        onTagDeleted={handleTagDeleted}
        onRolledBack={handleRolledBack}
      />

      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto -mx-3 px-3"
      >
        <div
          className="relative"
          style={{ height: `${virtualizer.getTotalSize()}px` }}
        >
          {virtualItems.map((virtualRow) => {
            const assignment = history[virtualRow.index]
            if (!assignment) return null
            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={(node) => virtualizer.measureElement(node)}
                className="absolute left-0 right-0 border-b border-stroke/80"
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                <TagHistoryRow
                  assignment={assignment}
                  primaryAssignment={primary}
                  teamSlug={teamSlug}
                  templateId={templateId}
                  onRequestRollback={handleRequestRowRollback}
                />
              </div>
            )
          })}
        </div>

        {hasNextPage && (
          <div className="flex w-full items-center justify-center py-3">
            <LoadMoreButton
              isLoading={isFetchingNextPage}
              onLoadMore={() => fetchNextPage()}
            />
          </div>
        )}
      </div>

      <RollbackTagDialog
        open={rollbackRequest !== null}
        onOpenChange={(next) => {
          if (!next) setRollbackRequest(null)
        }}
        tag={tag}
        currentBuildId={rollbackRequest?.currentBuildId ?? ''}
        targetBuildId={rollbackRequest?.target.buildId ?? ''}
        teamSlug={teamSlug}
        templateId={templateId}
        templateName={templateName}
        surface="history-row"
        onRolledBack={handleRolledBack}
      />
    </div>
  )
}
