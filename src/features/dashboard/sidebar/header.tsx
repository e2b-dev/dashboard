import { getTeam } from '@/server/team/get-team'
import { SidebarHeader, SidebarMenu } from '@/ui/primitives/sidebar'
import { Suspense } from 'react'
import DashboardSidebarCommand from './command'
import DashboardSidebarMenu from './menu'
import DashboardSidebarToggle from './toggle'

interface DashboardSidebarMenuResolverProps {
  params: Promise<{ teamIdOrSlug: string }>
}

export default function DashboardSidebarHeader({
  params,
}: DashboardSidebarMenuResolverProps) {
  return (
    <SidebarHeader className="p-0 gap-0">
      <DashboardSidebarToggle />
      <SidebarMenu className="p-0 gap-0">
        <Suspense fallback={null}>
          <DashboardSidebarMenuResolver params={params} />
        </Suspense>
        <DashboardSidebarCommand />
      </SidebarMenu>
    </SidebarHeader>
  )
}

async function DashboardSidebarMenuResolver({
  params,
}: DashboardSidebarMenuResolverProps) {
  const { teamIdOrSlug } = await params

  const res = await getTeam({ teamIdOrSlug })

  const team = res?.data

  return <DashboardSidebarMenu initialTeam={team} />
}
