import { DashboardTab, DashboardTabs } from '@/ui/dashboard-tabs'
import { BuildIcon, ListIcon } from '@/ui/primitives/icons'

export default function TemplatesLayout({
  children,
}: LayoutProps<'/dashboard/[teamSlug]/templates'>) {
  return (
    <DashboardTabs
      type="query"
      layoutKey="tabs-indicator-templates"
      className="pt-2 flex-1 md:pt-3"
    >
      <DashboardTab
        id="list"
        label="List"
        icon={<ListIcon className="size-4" />}
      >
        {children}
      </DashboardTab>
      <DashboardTab
        id="builds"
        label="Builds"
        icon={<BuildIcon className="size-4" />}
      >
        {children}
      </DashboardTab>
    </DashboardTabs>
  )
}
