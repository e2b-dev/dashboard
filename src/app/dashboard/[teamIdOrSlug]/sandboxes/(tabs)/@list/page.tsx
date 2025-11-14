import SandboxesTable from '@/features/dashboard/sandboxes/list/table'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'

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
      <SandboxesTable />
    </HydrateClient>
  )
}
