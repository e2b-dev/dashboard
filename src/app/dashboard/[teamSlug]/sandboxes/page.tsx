import { Suspense } from 'react'
import LoadingLayout from '@/features/dashboard/loading-layout'
import { NewSandboxesTable } from '@/features/dashboard/sandboxes/list/table'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'

export default async function SandboxesListPage({
  params,
}: {
  params: Promise<{ teamSlug: string }>
}) {
  const { teamSlug } = await params

  prefetch(
    trpc.sandboxes.listSandboxesPaginated.infiniteQueryOptions({
      teamSlug,
      limit: 50,
    })
  )

  return (
    <HydrateClient>
      <Suspense fallback={<LoadingLayout />}>
        <NewSandboxesTable />
      </Suspense>
    </HydrateClient>
  )
}
