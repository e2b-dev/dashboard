import { cookies } from 'next/headers'
import { redirect, unauthorized } from 'next/navigation'
import type { Metadata } from 'next/types'
import { serializeError } from 'serialize-error'
import { COOKIE_KEYS } from '@/configs/cookies'
import { METADATA } from '@/configs/metadata'
import { AUTH_URLS } from '@/configs/urls'
import { DashboardContextProvider } from '@/features/dashboard/context'
import DashboardLayoutView from '@/features/dashboard/layouts/layout'
import Sidebar from '@/features/dashboard/sidebar/sidebar'
import { l } from '@/lib/clients/logger/logger'
import { getSessionInsecure } from '@/server/auth/get-session'
import getUserByToken from '@/server/auth/get-user-by-token'
import { getTeam } from '@/server/team/get-team'
import { SidebarInset, SidebarProvider } from '@/ui/primitives/sidebar'

export const metadata: Metadata = {
  title: 'Dashboard - E2B',
  description: METADATA.description,
  openGraph: METADATA.openGraph,
  twitter: METADATA.twitter,
  robots: 'noindex, nofollow',
}

export interface DashboardLayoutProps {
  params: Promise<{
    teamIdOrSlug: string
  }>
  children: React.ReactNode
}

export default async function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  const cookieStore = await cookies()
  const { teamIdOrSlug } = await params

  const session = await getSessionInsecure()
  const { error, data } = await getUserByToken(session?.access_token)

  const sidebarState = cookieStore.get(COOKIE_KEYS.SIDEBAR_STATE)?.value
  const defaultOpen = sidebarState === 'true'

  if (error || !data.user) {
    throw redirect(AUTH_URLS.SIGN_IN)
  }

  const teamRes = await getTeam({ teamIdOrSlug })
  const team = teamRes?.data

  if (!team) {
    l.warn(
      {
        key: 'dashboard_layout:team_not_resolved',
        user_id: data.user.id,
        error: serializeError(teamRes?.serverError),
        context: {
          teamIdOrSlug,
        },
      },
      `dashboard_layout:team_not_resolved - team not resolved for user (${data.user.id}) when accessing team (${teamIdOrSlug}) in dashboard layout`
    )
    throw unauthorized()
  }

  return (
    <DashboardContextProvider initialTeam={team} initialUser={data.user}>
      <SidebarProvider
        defaultOpen={typeof sidebarState === 'undefined' ? true : defaultOpen}
      >
        <div className="fixed inset-0 flex max-h-full min-h-0 w-full flex-col overflow-hidden">
          <div className="flex h-full max-h-full min-h-0 w-full flex-1 overflow-hidden">
            <Sidebar />
            <SidebarInset>
              <DashboardLayoutView params={params}>
                {children}
              </DashboardLayoutView>
            </SidebarInset>
          </div>
        </div>
      </SidebarProvider>
    </DashboardContextProvider>
  )
}
