import { DashboardTab, DashboardTabs } from '@/ui/dashboard-tabs'
import { ListIcon, TrendIcon } from '@/ui/primitives/icons'

export default function SandboxesLayout({
  children,
}: LayoutProps<'/dashboard/[teamSlug]/sandboxes'>) {
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
        {children}
      </DashboardTab>
      <DashboardTab
        id="list"
        label="List"
        icon={<ListIcon className="size-4" />}
      >
        {children}
      </DashboardTab>
    </DashboardTabs>
  )
}
