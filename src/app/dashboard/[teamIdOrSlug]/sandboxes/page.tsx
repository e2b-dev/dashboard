import { DashboardTab, DashboardTabs } from '@/ui/dashboard-tabs'
import { ListIcon, TrendIcon } from '@/ui/primitives/icons'
import { Suspense } from 'react'
import LoadingLayout from '../../loading'
import ListContent from './components/list-content'
import MonitoringContent from './components/monitoring-content'

interface SandboxesPageProps {
  params: Promise<{ teamIdOrSlug: string }>
  searchParams: Promise<{ tab?: string; start?: string; end?: string }>
}

export default async function SandboxesPage({
  params,
  searchParams,
}: SandboxesPageProps) {
  const { teamIdOrSlug } = await params
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
          {tab === 'list' && <ListContent teamIdOrSlug={teamIdOrSlug} />}
        </Suspense>
      </DashboardTab>
    </DashboardTabs>
  )
}
