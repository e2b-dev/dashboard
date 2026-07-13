import type { ReactNode } from 'react'
import { ByocDeploymentRouteView } from '@/features/dashboard/byoc/byoc-deployment-route-view'
import { Page } from '@/features/dashboard/layouts/page'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'
import { DashboardTabsList } from '@/ui/dashboard-tabs'
import { CloudIcon, SettingsIcon } from '@/ui/primitives/icons'

export default async function ByocLayout({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ teamSlug: string }>
}) {
  const { teamSlug } = await params
  const basePath = `/dashboard/${teamSlug}/byoc`

  prefetch(trpc.byoc.locations.queryOptions({ teamSlug }))
  prefetch(trpc.byoc.allocatedTarget.queryOptions({ teamSlug }))
  prefetch(trpc.byoc.health.queryOptions({ teamSlug }))
  prefetch(trpc.byoc.listCloudConnections.queryOptions({ teamSlug }))
  prefetch(trpc.byoc.listDeployments.queryOptions({ teamSlug }))

  return (
    <HydrateClient>
      <div className="flex h-full min-h-0 flex-1 flex-col pt-2 md:pt-3">
        <DashboardTabsList
          layoutKey="tabs-indicator-byoc"
          tabs={[
            {
              id: 'configuration',
              label: 'Configuration',
              href: `${basePath}/configuration`,
              icon: <SettingsIcon className="size-4" />,
            },
            {
              id: 'infrastructure',
              label: 'Infrastructure',
              href: `${basePath}/infrastructure`,
              icon: <CloudIcon className="size-4" />,
            },
          ]}
        />
        <Page className="max-w-[1080px] py-4 md:py-5">
          <ByocDeploymentRouteView />
          {children}
        </Page>
      </div>
    </HydrateClient>
  )
}
