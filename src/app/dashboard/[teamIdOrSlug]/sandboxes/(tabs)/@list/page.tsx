import LoadingLayout from '@/features/dashboard/loading-layout'
import SandboxesTable from '@/features/dashboard/sandboxes/list/table'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'
import { Suspense } from 'react'

export default async function ListPage({
  params,
}: PageProps<'/dashboard/[teamIdOrSlug]/sandboxes'>) {
  const { teamIdOrSlug } = await params

  prefetch(
    trpc.sandboxes.getSandboxes.queryOptions({
      teamIdOrSlug,
    })
  )

  return (
    <HydrateClient>
      <Suspense fallback={<LoadingLayout />}>
        <SandboxesTable />
      </Suspense>
    </HydrateClient>
  )
}
