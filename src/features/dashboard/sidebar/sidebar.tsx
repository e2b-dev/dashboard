import { Sidebar, SidebarProps, SidebarRail } from '@/ui/primitives/sidebar'
import DashboardSidebarContent from './content'
import DashboardSidebarFooter from './footer'
import DashboardSidebarHeader from './header'

export default function DashboardSidebar({
  params,
  ...props
}: SidebarProps & { params: Promise<{ teamIdOrSlug: string }> }) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <DashboardSidebarHeader params={params} />
      <DashboardSidebarContent />
      <DashboardSidebarFooter />
      <SidebarRail />
    </Sidebar>
  )
}
