import SandboxesTable from '@/features/dashboard/sandboxes/list/table'
import { HydrateClient, trpc } from '@/trpc/server'

export default async function ListPage({
  params,
}: PageProps<'/dashboard/[teamIdOrSlug]/sandboxes'>) {
  const { teamIdOrSlug } = await params

  void trpc.sandboxes.getSandboxes.prefetch({
    teamIdOrSlug,
  })

  return (
    <HydrateClient>
      <SandboxesTable />
    </HydrateClient>
  )
}
