import { Sidebar, SidebarProps, SidebarRail } from '@/ui/primitives/sidebar'
import DashboardSidebarContent from './content'
import DashboardSidebarFooter from './footer'
import DashboardSidebarHeader from './header'

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
