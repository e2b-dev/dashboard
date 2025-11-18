import LoadingLayout from '@/features/dashboard/loading-layout'
import TemplatesTable from '@/features/dashboard/templates/table'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'
import { Suspense } from 'react'

export default async function Page({
  params,
}: PageProps<'/dashboard/[teamIdOrSlug]/templates'>) {
  const { teamIdOrSlug } = await params

  prefetch(
    trpc.templates.getTemplates.queryOptions({
      teamIdOrSlug,
    })
  )
  prefetch(trpc.templates.getDefaultTemplatesCached.queryOptions())

  return (
    <HydrateClient>
      <Suspense fallback={<LoadingLayout />}>
        <TemplatesTable />
      </Suspense>
    </HydrateClient>
  )
}
