import LoadingLayout from '@/features/dashboard/loading-layout'
import { INITIAL_BUILD_STATUSES } from '@/features/dashboard/templates/builds/constants'
import { loadTemplateBuildsFilters } from '@/features/dashboard/templates/builds/filter-params'
import BuildsHeader from '@/features/dashboard/templates/builds/header'
import BuildsTable from '@/features/dashboard/templates/builds/table'
import { BuildStatus } from '@/server/api/models/builds.models'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'
import { Suspense } from 'react'

export default async function BuildsPage({
  params,
  searchParams,
}: PageProps<'/dashboard/[teamIdOrSlug]/templates'>) {
  const { teamIdOrSlug } = await params

  const filters = await loadTemplateBuildsFilters(searchParams)

  const statuses =
    (filters.statuses as BuildStatus[] | null) ?? INITIAL_BUILD_STATUSES

  const buildIdOrTemplate = filters.buildIdOrTemplate ?? undefined

  prefetch(
    trpc.builds.list.infiniteQueryOptions({
      teamIdOrSlug,
      buildIdOrTemplate,
      statuses,
    })
  )

  return (
    <div className="h-full min-h-0 flex-1 px-3 md:p-6 flex flex-col gap-3">
      <HydrateClient>
        <BuildsHeader />
        <Suspense fallback={<LoadingLayout />}>
          <BuildsTable />
        </Suspense>
      </HydrateClient>
    </div>
  )
}
