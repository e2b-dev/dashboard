import BuildHeader from '@/features/dashboard/build/header'
import Logs from '@/features/dashboard/build/logs'
import { loadBuildLogsFilters } from '@/features/dashboard/build/logs-filter-params'
import { getQueryClient, HydrateClient, trpc } from '@/trpc/server'
import { TRPCError } from '@trpc/server'
import { notFound } from 'next/navigation'

export default async function BuildPage({
  params,
  searchParams,
}: PageProps<'/dashboard/[teamIdOrSlug]/templates/[templateId]/builds/[buildId]'>) {
  const { teamIdOrSlug, templateId, buildId } = await params
  const { level } = await loadBuildLogsFilters(searchParams)

  const queryClient = getQueryClient()

  let exists = true
  let isBuilding = false

  try {
    const [buildDetails] = await Promise.all([
      queryClient.fetchQuery(
        trpc.builds.buildDetails.queryOptions({
          teamIdOrSlug,
          templateId,
          buildId,
        })
      ),
      queryClient.fetchInfiniteQuery(
        trpc.builds.buildLogsBackwards.infiniteQueryOptions({
          teamIdOrSlug,
          templateId,
          buildId,
          level: level ?? undefined,
        })
      ),
    ])

    if (!buildDetails.hasRetainedLogs) {
      exists = false
    }

    isBuilding = buildDetails.status === 'building'
  } catch (error) {
    if (error instanceof TRPCError && error.code === 'NOT_FOUND') {
      exists = false
    }
  }

  if (!exists) {
    notFound()
  }

  return (
    <HydrateClient>
      <div className="h-full min-h-0 flex-1 p-3 md:p-6 flex flex-col gap-6">
        <BuildHeader params={params} />
        <Logs params={params} />
      </div>
    </HydrateClient>
  )
}
