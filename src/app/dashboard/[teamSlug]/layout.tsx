import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next/types'
import { DashboardTeamGate } from '@/app/dashboard/[teamSlug]/team-gate'
import { COOKIE_KEYS } from '@/configs/cookies'
import { isOryAuthEnabled } from '@/configs/flags'
import { METADATA } from '@/configs/metadata'
import { AUTH_URLS } from '@/configs/urls'
import { DASHBOARD_TEAMS_LIST_QUERY_OPTIONS } from '@/core/application/teams/queries'
import { DASHBOARD_USER_PROFILE_QUERY_OPTIONS } from '@/core/application/user/queries'
import { auth } from '@/core/server/auth'
import DashboardLayoutView from '@/features/dashboard/layouts/layout'
import Sidebar from '@/features/dashboard/sidebar/sidebar'
import { OryPostHogIdentityBridge } from '@/features/ory-posthog-identity-bridge'
import { HydrateClient, prefetchAsync, trpc } from '@/trpc/server'
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
    teamSlug: string
  }>
  children: React.ReactNode
}

export default async function DashboardLayout({
  children,
  params,
}: DashboardLayoutProps) {
  const cookieStore = await cookies()
  const { teamSlug } = await params
  const authContext = await auth.getAuthContext()
  const postHogEnabled =
    isOryAuthEnabled() && !!process.env.NEXT_PUBLIC_POSTHOG_KEY

  const sidebarState = cookieStore.get(COOKIE_KEYS.SIDEBAR_STATE)?.value
  const defaultOpen = sidebarState === 'true'

  if (!authContext) {
    throw redirect(AUTH_URLS.SIGN_IN)
  }

  await Promise.all([
    prefetchAsync(
      trpc.teams.list.queryOptions(
        undefined,
        DASHBOARD_TEAMS_LIST_QUERY_OPTIONS
      )
    ),
    prefetchAsync(
      trpc.user.profile.queryOptions(
        undefined,
        DASHBOARD_USER_PROFILE_QUERY_OPTIONS
      )
    ),
  ])

  return (
    <HydrateClient>
      {postHogEnabled && <OryPostHogIdentityBridge user={authContext.user} />}
      <DashboardTeamGate teamSlug={teamSlug} fallbackUser={authContext.user}>
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
