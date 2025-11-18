import { DashboardTab, DashboardTabs } from '@/ui/dashboard-tabs'
import { ListIcon, TrendIcon } from '@/ui/primitives/icons'

export default function SandboxesLayout({
  list,
  monitoring,
}: LayoutProps<'/dashboard/[teamIdOrSlug]/sandboxes'> & {
  list: React.ReactNode
  monitoring: React.ReactNode
}) {
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
        {monitoring}
      </DashboardTab>
      <DashboardTab
        id="list"
        label="List"
        icon={<ListIcon className="size-4" />}
      >
        {list}
      </DashboardTab>
    </DashboardTabs>
  )
}
