import SidebarList from './list'
import {
  Sidebar,
  SidebarContent,
  SidebarProps,
  SidebarRail,
} from '@/ui/primitives/sidebar'
import DashboardSidebarHeader from './header'
import DashboardSidebarFooter from './footer'

export default function DashboardSidebar({ ...props }: SidebarProps) {
  return (
    <Sidebar collapsible="icon" {...props}>
      <DashboardSidebarHeader />
      <SidebarContent>
        <SidebarList />
      </SidebarContent>
      <DashboardSidebarFooter />
      <SidebarRail />
    </Sidebar>
  )
}
