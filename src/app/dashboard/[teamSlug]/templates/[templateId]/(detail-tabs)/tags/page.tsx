import { Suspense } from 'react'
import LoadingLayout from '@/features/dashboard/loading-layout'
import TagsTable from '@/features/dashboard/templates/tags/table'

export default async function TemplateTagsPage({
  params,
}: PageProps<'/dashboard/[teamSlug]/templates/[templateId]'>) {
  const { teamSlug, templateId } = await params

  return (
    <div className="h-full min-h-0 flex-1 p-3 md:p-6 flex flex-col gap-3">
      <Suspense fallback={<LoadingLayout />}>
        <TagsTable teamSlug={teamSlug} templateId={templateId} />
      </Suspense>
    </div>
  )
}
