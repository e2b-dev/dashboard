import { Suspense } from 'react'
import LoadingLayout from '@/features/dashboard/loading-layout'
import TagHistoryView from '@/features/dashboard/templates/tags/history/tag-history-view'

export default async function TemplateTagHistoryPage({
  params,
}: PageProps<'/dashboard/[teamSlug]/templates/[templateId]/tags/[tag]'>) {
  const { teamSlug, templateId, tag } = await params
  const decodedTag = decodeURIComponent(tag)

  return (
    <div className="h-full min-h-0 flex-1 py-6 px-8 md:px-11 flex flex-col gap-3 max-w-[924px] mx-auto w-full">
      <Suspense fallback={<LoadingLayout />}>
        <TagHistoryView
          teamSlug={teamSlug}
          templateId={templateId}
          tag={decodedTag}
        />
      </Suspense>
    </div>
  )
}
