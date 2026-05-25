import { Suspense } from 'react'
import TemplateDetailHeader from '@/features/dashboard/templates/detail/header'
import TemplateDetailHeaderSkeleton from '@/features/dashboard/templates/detail/header-skeleton'

export default async function TemplateOverviewPage({
  params,
}: PageProps<'/dashboard/[teamSlug]/templates/[templateId]'>) {
  const { teamSlug, templateId } = await params

  return (
    <div className="p-3 md:p-6 flex flex-col gap-6">
      <Suspense fallback={<TemplateDetailHeaderSkeleton />}>
        <TemplateDetailHeader teamSlug={teamSlug} templateId={templateId} />
      </Suspense>
    </div>
  )
}
