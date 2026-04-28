import { Suspense } from 'react'
import LoadingLayout from '@/features/dashboard/loading-layout'
import SandboxesTable from '@/features/dashboard/sandboxes/list/table'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'

export default async function ListPage({
  params,
}: PageProps<'/dashboard/[teamSlug]/sandboxes'>) {
  const { teamSlug } = await params

  prefetch(
    trpc.sandboxes.getSandboxes.queryOptions({
      teamSlug,
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
