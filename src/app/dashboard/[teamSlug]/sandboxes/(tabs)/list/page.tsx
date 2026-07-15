import { Suspense } from 'react'
import LoadingLayout from '@/features/dashboard/loading-layout'
import { SandboxesTable } from '@/features/dashboard/sandboxes/list/table'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'

export default async function SandboxesListPage({
  params,
}: PageProps<'/dashboard/[teamSlug]/sandboxes/list'>) {
  const { teamSlug } = await params

  prefetch(
    trpc.sandboxes.listSandboxesPaginated.infiniteQueryOptions({
      teamSlug,
      limit: 50,
      order: 'desc',
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
