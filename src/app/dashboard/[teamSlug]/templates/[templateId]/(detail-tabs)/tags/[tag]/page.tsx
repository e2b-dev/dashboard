import { Suspense } from 'react'
import LoadingLayout from '@/features/dashboard/loading-layout'
import { TAG_HISTORY_PAGE_LIMIT } from '@/features/dashboard/templates/tags/constants'
import TagHistoryView from '@/features/dashboard/templates/tags/history/tag-history-view'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'

export default async function TemplateTagHistoryPage({
  params,
}: PageProps<'/dashboard/[teamSlug]/templates/[templateId]/tags/[tag]'>) {
  const { teamSlug, templateId, tag } = await params
  const decodedTag = decodeURIComponent(tag)

  prefetch(
    trpc.templates.getTagAssignments.infiniteQueryOptions({
      teamSlug,
      templateId,
      tag: decodedTag,
      limit: TAG_HISTORY_PAGE_LIMIT,
    })
  )

  return (
    <HydrateClient>
      <div className="h-full min-h-0 flex-1 py-6 px-8 md:px-11 flex flex-col gap-3 max-w-[924px] mx-auto w-full">
        <Suspense fallback={<LoadingLayout />}>
          <TagHistoryView
            teamSlug={teamSlug}
            templateId={templateId}
            tag={decodedTag}
          />
        </Suspense>
      </div>
    </HydrateClient>
  )
}
