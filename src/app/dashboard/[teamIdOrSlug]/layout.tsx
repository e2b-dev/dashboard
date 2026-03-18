import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next/types'
import { DashboardTeamGate } from '@/app/dashboard/[teamIdOrSlug]/team-gate'
import { COOKIE_KEYS } from '@/configs/cookies'
import { METADATA } from '@/configs/metadata'
import { AUTH_URLS } from '@/configs/urls'
import { getSessionInsecure } from '@/core/server/functions/auth/get-session'
import getUserByToken from '@/core/server/functions/auth/get-user-by-token'
import DashboardLayoutView from '@/features/dashboard/layouts/layout'
import Sidebar from '@/features/dashboard/sidebar/sidebar'
import { HydrateClient, prefetch, trpc } from '@/trpc/server'
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

  prefetch(trpc.teams.list.queryOptions())

  return (
    <HydrateClient>
      <DashboardTeamGate teamIdOrSlug={teamIdOrSlug} user={data.user}>
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
      </DashboardTeamGate>
    </HydrateClient>
  )
}
