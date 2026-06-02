import { Suspense } from 'react'
import LoadingLayout from '@/features/dashboard/loading-layout'
import TagsTable from '@/features/dashboard/templates/tags/table'

export default async function TemplateTagsPage({
  params,
}: PageProps<'/dashboard/[teamSlug]/templates/[templateId]'>) {
  const { teamSlug, templateId } = await params

  return (
    <div className="h-full min-h-0 flex-1 py-6 md:py-10 px-8 md:px-11 flex flex-col gap-3 max-w-[924px] mx-auto w-full">
      <Suspense fallback={<LoadingLayout />}>
        <TagsTable teamSlug={teamSlug} templateId={templateId} />
      </Suspense>
    </div>
  )
}
