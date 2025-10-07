import { COOKIE_KEYS } from '@/configs/keys'
import { METADATA } from '@/configs/metadata'
import { DashboardTitleProvider } from '@/features/dashboard/dashboard-title-provider'
import DashboardLayoutView from '@/features/dashboard/layout/layout'
import { ServerContextProvider } from '@/features/dashboard/server-context'
import Sidebar from '@/features/dashboard/sidebar/sidebar'
import {
  resolveTeamIdInServerComponent,
  resolveTeamSlugInServerComponent,
} from '@/lib/utils/server'
import { getSessionInsecure } from '@/server/auth/get-session'
import { getUserTeams } from '@/server/team/get-team'
import { SidebarInset, SidebarProvider } from '@/ui/primitives/sidebar'
import { cookies } from 'next/headers'
import { Suspense } from 'react'

interface DashboardLayoutProps {
  children: React.ReactNode
  header?: React.ReactNode
}

export const metadata = {
  title: METADATA.title,
  description: METADATA.description,
  openGraph: METADATA.openGraph,
  twitter: METADATA.twitter,
  robots: 'noindex, nofollow',
}

export default async function DashboardLayout({
  children: page,
  // we are injecting server components from deeper route tree parts
  // gives access to previously unavailable props for specific pages
  // passes up the tree without breaking ssr cycle.
  //
  // read more: [@/app/dashboard/_read_me/INJECTABLES.md](@/app/dashboard/_read_me/INJECTABLES.md)
  header: headerInjectable,
}: DashboardLayoutProps) {
  const teamId = await resolveTeamIdInServerComponent()
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
      <SidebarProvider
        defaultOpen={typeof sidebarState === 'undefined' ? true : defaultOpen}
      >
        <div className="min-h-dvh min-w-dvw flex max-h-full w-full flex-col overflow-hidden">
          <div className="flex h-full max-h-full min-h-0 w-full flex-1 overflow-hidden">
            <Sidebar />
            <SidebarInset>
              <DashboardLayoutView
                teamIdOrSlug={teamSlug}
                headerInjectable={headerInjectable}
              >
                {page}
              </DashboardLayoutView>
            </SidebarInset>
          </div>
        </div>
      </SidebarProvider>
      <Suspense fallback={null}>
        <DashboardTitleProvider />
      </Suspense>
    </ServerContextProvider>
  )
}
