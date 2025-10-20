import { SidebarHeader, SidebarMenu } from '@/ui/primitives/sidebar'
import DashboardSidebarCommand from './command'
import DashboardSidebarMenu from './menu'
import DashboardSidebarToggle from './toggle'

export default function DashboardSidebarHeader() {
  return (
    <SidebarHeader className="p-0 gap-0">
      <DashboardSidebarToggle />
      <SidebarMenu className="p-0 gap-0">
        <DashboardSidebarMenu />
        <DashboardSidebarCommand />
      </SidebarMenu>
    </SidebarHeader>
  )
}
