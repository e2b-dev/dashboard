import Sidebar from '@/features/dashboard/sidebar/sidebar'
import NetworkStateBanner from '@/ui/network-state-banner'
import { DashboardTitleProvider } from '@/features/dashboard/dashboard-title-provider'
import { Suspense } from 'react'
import { ServerContextProvider } from '@/lib/hooks/use-server-context'
import {
  resolveTeamIdInServerComponent,
  resolveTeamSlugInServerComponent,
} from '@/lib/utils/server'
import { getUserTeams } from '@/server/team/get-team'
import { getSessionInsecure } from '@/server/auth/get-session'
import { SidebarInset, SidebarProvider } from '@/ui/primitives/sidebar'
import { cookies } from 'next/headers'
import { COOKIE_KEYS } from '@/configs/keys'

interface DashboardLayoutProps {
  children: React.ReactNode
  params: Promise<{
    teamIdOrSlug: string
  }>
}

export default async function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  const { teamIdOrSlug } = await params

  const teamId = await resolveTeamIdInServerComponent(teamIdOrSlug)
  const teamSlug = await resolveTeamSlugInServerComponent()
  const session = await getSessionInsecure()
  const res = await getUserTeams()

  if (!res?.data || res.serverError) {
    throw new Error(res?.serverError || 'Error loading teams.')
  }

  const cookieStore = await cookies()

  const sidebarState = cookieStore.get(COOKIE_KEYS.SIDEBAR_STATE)?.value
  const defaultOpen = sidebarState === 'true'

  return (
    <ServerContextProvider
      teamId={teamId}
      teamSlug={teamSlug}
      teams={res.data}
      user={session!.user}
    >
      <SidebarProvider defaultOpen={defaultOpen}>
        <div className="fixed inset-0 flex max-h-full w-full flex-col overflow-hidden">
          <NetworkStateBanner />
          <div className="flex h-full max-h-full w-full flex-1 overflow-hidden">
            <Sidebar />
            <SidebarInset>{children}</SidebarInset>
          </div>
        </div>
        <Suspense fallback={null}>
          <DashboardTitleProvider />
        </Suspense>
      </SidebarProvider>
    </ServerContextProvider>
  )
}
