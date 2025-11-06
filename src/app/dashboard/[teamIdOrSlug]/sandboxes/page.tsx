import LoadingLayout from '@/features/dashboard/loading-layout'
import ListContent from '@/features/dashboard/sandboxes/list/content'
import MonitoringContent from '@/features/dashboard/sandboxes/monitoring/content'
import { DashboardTab, DashboardTabs } from '@/ui/dashboard-tabs'
import { ListIcon, TrendIcon } from '@/ui/primitives/icons'
import { Suspense } from 'react'

interface SandboxesPageProps {
  params: Promise<{ teamIdOrSlug: string }>
  searchParams: Promise<{ tab?: string; start?: string; end?: string }>
}

export default async function SandboxesPage({
  params,
  searchParams,
}: SandboxesPageProps) {
  const { tab = 'monitoring' } = await searchParams

  return (
    <DashboardTabs
      type="query"
      layoutKey="tabs-indicator-sandboxes"
      className="mt-2 md:mt-3"
    >
      <DashboardTab
        id="monitoring"
        label="Monitoring"
        icon={<TrendIcon className="size-4" />}
      >
        <Suspense fallback={<LoadingLayout />}>
          {tab === 'monitoring' && (
            <MonitoringContent params={params} searchParams={searchParams} />
          )}
        </Suspense>
      </DashboardTab>
      <DashboardTab
        id="list"
        label="List"
        icon={<ListIcon className="size-4" />}
      >
        <Suspense fallback={<LoadingLayout />}>
          {tab === 'list' && <ListContent params={params} />}
        </Suspense>
      </DashboardTab>
    </DashboardTabs>
  )
}
