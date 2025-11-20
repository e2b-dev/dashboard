import LoadingLayout from '@/features/dashboard/loading-layout'
import BuildsTable from '@/features/dashboard/templates/builds/table'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'
import { Suspense } from 'react'

export default async function BuildsPage({
  params,
}: PageProps<'/dashboard/[teamIdOrSlug]/templates'>) {
  const { teamIdOrSlug } = await params

  prefetch(
    trpc.builds.getCompletedBuilds.infiniteQueryOptions({
      teamIdOrSlug,
      limit: 20,
    })
  )

  return (
    <HydrateClient>
      <Suspense fallback={<LoadingLayout />}>
        <BuildsTable />
      </Suspense>
    </HydrateClient>
  )
}
