import { Sidebar, SidebarProps, SidebarRail } from '@/ui/primitives/sidebar'
import DashboardSidebarHeader from './header'
import DashboardSidebarFooter from './footer'
import DashboardSidebarContent from './content'

export default function DashboardSidebar({ ...props }: SidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <DashboardSidebarHeader />
      <DashboardSidebarContent />
      <DashboardSidebarFooter />
      <SidebarRail />
    </Sidebar>
  )
}
