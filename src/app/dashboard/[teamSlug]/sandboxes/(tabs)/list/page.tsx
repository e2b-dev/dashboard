import { Suspense } from 'react'
import LoadingLayout from '@/features/dashboard/loading-layout'
import SandboxesTable from '@/features/dashboard/sandboxes/list/table'
import { HydrateClient } from '@/trpc/server'

export default async function SandboxesListPage({
  params,
}: PageProps<'/dashboard/[teamSlug]/sandboxes/list'>) {
  await params

  return (
    <HydrateClient>
      <Suspense fallback={<LoadingLayout />}>
        <SandboxesTable />
      </Suspense>
    </HydrateClient>
  )
}
