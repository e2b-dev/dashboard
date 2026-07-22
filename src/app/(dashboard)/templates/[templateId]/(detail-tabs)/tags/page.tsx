import { Suspense } from 'react'
import LoadingLayout from '@/features/dashboard/loading-layout'
import { TAGS_PAGE_LIMIT } from '@/features/dashboard/templates/tags/constants'
import TagsTable from '@/features/dashboard/templates/tags/table'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'

export default async function TemplateTagsPage({
  params,
}: PageProps<'/templates/[templateId]'>) {
  const { templateId } = await params

  prefetch(
    trpc.templates.getTagGroups.infiniteQueryOptions({
      templateId,
      limit: TAGS_PAGE_LIMIT,
      search: undefined,
      sort: undefined,
    })
  )
  prefetch(trpc.templates.getTagCount.queryOptions({ templateId }))

  return (
    <HydrateClient>
      <div className="h-full min-h-0 flex-1 pt-6 pb-2 md:pt-10 md:pb-4 px-8 md:px-11 flex flex-col gap-3 max-w-[924px] mx-auto w-full">
        <Suspense fallback={<LoadingLayout />}>
          <TagsTable templateId={templateId} />
        </Suspense>
      </div>
    </HydrateClient>
  )
}
