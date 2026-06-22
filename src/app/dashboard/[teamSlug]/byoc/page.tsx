import { ByocDeploymentPanel } from '@/features/dashboard/byoc/byoc-deployment-panel'
import { Page } from '@/features/dashboard/layouts/page'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'

interface ByocPageProps {
  params: Promise<{ teamSlug: string }>
}

export default async function ByocPage({ params }: ByocPageProps) {
  const { teamSlug } = await params

  prefetch(trpc.byoc.target.queryOptions({ teamSlug }))
  prefetch(trpc.byoc.health.queryOptions({ teamSlug }))
  prefetch(trpc.byoc.listCloudConnections.queryOptions({ teamSlug }))
  prefetch(trpc.byoc.listDeployments.queryOptions({ teamSlug }))

  return (
    <HydrateClient>
      <Page className="max-w-[1080px]">
        <ByocDeploymentPanel />
      </Page>
    </HydrateClient>
  )
}
