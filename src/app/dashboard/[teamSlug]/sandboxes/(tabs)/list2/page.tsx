import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { PROTECTED_URLS } from '@/configs/urls'
import LoadingLayout from '@/features/dashboard/loading-layout'
import { isNewSandboxListEnabled } from '@/features/dashboard/sandboxes/list/feature-flag.server'
import { NewSandboxesTable } from '@/features/dashboard/sandboxes/list/table'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'

export default async function NewSandboxesListPage({
  params,
}: {
  params: Promise<{ teamSlug: string }>
}) {
  const { teamSlug } = await params

  if (!(await isNewSandboxListEnabled(teamSlug))) {
    redirect(PROTECTED_URLS.SANDBOXES_LIST(teamSlug))
  }

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
