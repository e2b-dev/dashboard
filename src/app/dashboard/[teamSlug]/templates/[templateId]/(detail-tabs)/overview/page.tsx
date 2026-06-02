import { Suspense } from 'react'
import TemplateOverview from '@/features/dashboard/templates/detail/overview'
import { TemplateOverviewSkeleton } from '@/features/dashboard/templates/detail/overview/skeleton'
import { prefetch, trpc } from '@/trpc/server'

export default async function TemplateOverviewPage({
  params,
}: PageProps<'/dashboard/[teamSlug]/templates/[templateId]'>) {
  const { teamSlug, templateId } = await params

  prefetch(trpc.templates.getTemplate.queryOptions({ teamSlug, templateId }))

  return (
    <div className="p-3 md:p-6 flex flex-col gap-6 w-full max-w-[600px] mx-auto">
      <Suspense fallback={<TemplateOverviewSkeleton />}>
        <TemplateOverview teamSlug={teamSlug} templateId={templateId} />
      </Suspense>
    </div>
  )
}
