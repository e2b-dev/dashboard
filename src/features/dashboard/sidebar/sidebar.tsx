import { Sidebar, type SidebarProps } from '@/ui/primitives/sidebar'
import DashboardSidebarContent from './content'
import DashboardSidebarFooter from './footer'
import DashboardSidebarHeader from './header'
import DashboardSidebarRail from './rail'

export default function DashboardSidebar(props: SidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <DashboardSidebarHeader />
      <DashboardSidebarContent />
      <DashboardSidebarFooter />
      <DashboardSidebarRail />
    </Sidebar>
  )
}
