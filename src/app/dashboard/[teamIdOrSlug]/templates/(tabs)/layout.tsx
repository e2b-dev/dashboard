import { DashboardTab, DashboardTabs } from '@/ui/dashboard-tabs'
import { ListIcon } from '@/ui/primitives/icons'
import { PackageIcon } from 'lucide-react'

export default function TemplatesLayout({
  list,
  builds,
}: LayoutProps<'/dashboard/[teamIdOrSlug]/templates'> & {
  list: React.ReactNode
  builds: React.ReactNode
}) {
  return (
    <DashboardTabs
      type="query"
      layoutKey="tabs-indicator-templates"
      className="mt-2 md:mt-3"
    >
      <DashboardTab
        id="list"
        label="List"
        icon={<ListIcon className="size-4" />}
      >
        {list}
      </DashboardTab>
      <DashboardTab
        id="builds"
        label="Builds"
        icon={<PackageIcon className="size-4" />}
      >
        {builds}
      </DashboardTab>
    </DashboardTabs>
  )
}
