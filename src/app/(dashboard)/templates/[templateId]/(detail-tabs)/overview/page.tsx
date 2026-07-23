import { Suspense } from 'react'
import TemplateOverview from '@/features/dashboard/templates/detail/overview'
import { TemplateOverviewSkeleton } from '@/features/dashboard/templates/detail/overview/skeleton'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'

export default async function TemplateOverviewPage({
  params,
}: PageProps<'/templates/[templateId]'>) {
  const { templateId } = await params

  prefetch(trpc.templates.getTemplate.queryOptions({ templateId }))

  return (
    <HydrateClient>
      <div className="p-6 md:p-10 flex flex-col gap-6 w-full max-w-[600px] mx-auto">
        <Suspense fallback={<TemplateOverviewSkeleton />}>
          <TemplateOverview templateId={templateId} />
        </Suspense>
      </div>
    </HydrateClient>
  )
}
