import BuildHeader from '@/features/dashboard/build/header'
import Logs from '@/features/dashboard/build/logs'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'

export default async function BuildPage({
  params,
}: PageProps<'/dashboard/[teamIdOrSlug]/templates/[templateId]/builds/[buildId]'>) {
  const { teamIdOrSlug, templateId, buildId } = await params

  prefetch(
    trpc.builds.buildDetails.queryOptions({
      teamIdOrSlug,
      templateId,
      buildId,
    })
  )

  return (
    <HydrateClient>
      <div className="h-full min-h-0 flex-1 p-3 md:p-6 flex flex-col gap-6">
        <BuildHeader params={params} />
        <Logs params={params} />
      </div>
    </HydrateClient>
  )
}
