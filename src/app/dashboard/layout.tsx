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
import { CircleAlert } from 'lucide-react'
import PersistentNotificationBanner from '@/features/dashboard/persistent-notification-banner'

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

  const selectedTeam = res?.data.find((team) => team.id === teamId) ?? null

  return (
    <ServerContextProvider
      teamId={teamId}
      teamSlug={teamSlug}
      selectedTeam={selectedTeam}
      teams={res.data}
      user={session!.user}
    >
      <SidebarProvider defaultOpen={defaultOpen}>
        <div className="fixed inset-0 flex max-h-full w-full flex-col overflow-hidden">
          <PersistentNotificationBanner
            icon={<CircleAlert className="h-4 min-w-4 text-orange-500" />}
            title={
              <p className="text-sm text-orange-500">
                The selected team is currently blocked. Please contact support
                if you need help.
              </p>
            }
            isOpen={true}
            className="min-h-12.5"
          />
          <div className="flex h-full max-h-full w-full flex-1 overflow-hidden">
            <Sidebar />
            <SidebarInset>{children}</SidebarInset>
          </div>
        </div>
      </SidebarProvider>
      <Suspense fallback={null}>
        <DashboardTitleProvider />
      </Suspense>
    </ServerContextProvider>
  )
}
