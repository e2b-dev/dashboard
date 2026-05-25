import { Suspense } from 'react'
import TemplateDetailHeader from '@/features/dashboard/templates/detail/header'
import TemplateDetailHeaderSkeleton from '@/features/dashboard/templates/detail/header-skeleton'

/**
 * Template detail \u2014 Overview tab.
 *
 * v1: the 5-cell DetailsRow is the only content.
 * Future iterations will add: running-sandboxes chart, description /
 * dockerfile-like view, and a versions section. See the v1 plan.
 */
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
