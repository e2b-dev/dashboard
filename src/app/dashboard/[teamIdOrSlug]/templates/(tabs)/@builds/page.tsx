import LoadingLayout from '@/features/dashboard/loading-layout'
import BuildsHeader from '@/features/dashboard/templates/builds/header'
import BuildsTable from '@/features/dashboard/templates/builds/table'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'
import { Suspense } from 'react'

export default async function BuildsPage({
  params,
}: PageProps<'/dashboard/[teamIdOrSlug]/templates'>) {
  const { teamIdOrSlug } = await params

  prefetch(
    trpc.builds.list.infiniteQueryOptions({
      teamIdOrSlug,
      limit: 20,
    })
  )

  return (
    <div className="h-full min-h-0 flex-1 px-3 md:p-6 flex flex-col gap-3">
      <HydrateClient>
        <BuildsHeader />
        <Suspense fallback={<LoadingLayout />}>
          <BuildsTable />
        </Suspense>
      </HydrateClient>
    </div>
  )
}
