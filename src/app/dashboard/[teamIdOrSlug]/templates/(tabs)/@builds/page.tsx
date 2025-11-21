import { INITIAL_BUILD_STATUSES } from '@/features/dashboard/templates/builds/constants'
import { loadTemplateBuildsFilters } from '@/features/dashboard/templates/builds/filter-params'
import BuildsHeader from '@/features/dashboard/templates/builds/header'
import BuildsTable from '@/features/dashboard/templates/builds/table'
import type { BuildStatusDTO } from '@/server/api/models/builds.models'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'

export default async function BuildsPage({
  params,
  searchParams,
}: PageProps<'/dashboard/[teamIdOrSlug]/templates'>) {
  const { teamIdOrSlug } = await params

  const filters = await loadTemplateBuildsFilters(searchParams)

  const statuses =
    (filters.statuses as BuildStatusDTO[] | null) ?? INITIAL_BUILD_STATUSES

  const buildIdOrTemplate = filters.buildIdOrTemplate ?? undefined

  prefetch(
    trpc.builds.list.infiniteQueryOptions({
      teamIdOrSlug,
      buildIdOrTemplate,
      statuses,
    })
  )

  return (
    <div className="h-full min-h-0 flex-1 p-3 flex flex-col gap-3">
      <HydrateClient>
        <BuildsHeader />
        <BuildsTable />
      </HydrateClient>
    </div>
  )
}
