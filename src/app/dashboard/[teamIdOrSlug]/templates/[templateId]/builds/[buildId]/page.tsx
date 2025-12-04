import BuildHeader from '@/features/dashboard/build/header'
import Logs from '@/features/dashboard/build/logs'
import { getQueryClient, HydrateClient, trpc } from '@/trpc/server'
import { TRPCError } from '@trpc/server'
import { notFound } from 'next/navigation'

export default async function BuildPage({
  params,
}: PageProps<'/dashboard/[teamIdOrSlug]/templates/[templateId]/builds/[buildId]'>) {
  const { teamIdOrSlug, templateId, buildId } = await params

  const queryClient = getQueryClient()

  try {
    const data = await queryClient.fetchQuery(
      trpc.builds.buildDetails.queryOptions({
        teamIdOrSlug,
        templateId,
        buildId,
      })
    )

    if (!data.hasRetainedLogs) throw notFound()
  } catch (error) {
    if (error instanceof TRPCError && error.code === 'NOT_FOUND') {
      throw notFound()
    }
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
