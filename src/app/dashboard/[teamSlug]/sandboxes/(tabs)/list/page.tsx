import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { PROTECTED_URLS } from '@/configs/urls'
import LoadingLayout from '@/features/dashboard/loading-layout'
import { isNewSandboxListEnabled } from '@/features/dashboard/sandboxes/list/feature-flag.server'
import SandboxesTable from '@/features/dashboard/sandboxes/list/table'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'

export default async function SandboxesListPage({
  params,
}: PageProps<'/dashboard/[teamSlug]/sandboxes/list'>) {
  const { teamSlug } = await params

  if (await isNewSandboxListEnabled(teamSlug)) {
    redirect(PROTECTED_URLS.SANDBOXES_LIST2(teamSlug))
  }

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
