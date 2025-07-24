import { COOKIE_KEYS } from '@/configs/keys'
import { DashboardTitleProvider } from '@/features/dashboard/dashboard-title-provider'
import Sidebar from '@/features/dashboard/sidebar/sidebar'
import { ServerContextProvider } from '@/lib/hooks/use-server-context'
import {
  resolveTeamIdInServerComponent,
  resolveTeamSlugInServerComponent,
} from '@/lib/utils/server'
import { getSessionInsecure } from '@/server/auth/get-session'
import { getUserTeams } from '@/server/team/get-team'
import { SidebarInset, SidebarProvider } from '@/ui/primitives/sidebar'
import type { Metadata } from 'next'
import { cookies } from 'next/headers'
import { Suspense } from 'react'

interface DashboardLayoutProps {
  children: React.ReactNode
  params: Promise<{
    teamIdOrSlug: string
  }>
}

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
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
