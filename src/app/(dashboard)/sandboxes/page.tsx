import { Suspense } from 'react'
import LoadingLayout from '@/features/dashboard/loading-layout'
import { NewSandboxesTable } from '@/features/dashboard/sandboxes/list/table'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'

export default async function SandboxesListPage() {
  prefetch(
    trpc.sandboxes.listSandboxesPaginated.infiniteQueryOptions({
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
