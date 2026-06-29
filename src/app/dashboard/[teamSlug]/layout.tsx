import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next/types'
import { DashboardTeamGate } from '@/app/dashboard/[teamSlug]/team-gate'
import { COOKIE_KEYS } from '@/configs/cookies'
import { METADATA } from '@/configs/metadata'
import { AUTH_URLS } from '@/configs/urls'
import { DASHBOARD_TEAMS_LIST_QUERY_OPTIONS } from '@/core/application/teams/queries'
import { DASHBOARD_USER_PROFILE_QUERY_OPTIONS } from '@/core/application/user/queries'
import { FeatureFlagsProvider } from '@/core/modules/feature-flags/feature-flags.client'
import { featureFlags } from '@/core/modules/feature-flags/feature-flags.server'
import { getAuthContext } from '@/core/server/auth'
import DashboardLayoutView from '@/features/dashboard/layouts/layout'
import { DashboardPostHogErrorBoundary } from '@/features/dashboard/posthog-error-boundary'
import Sidebar from '@/features/dashboard/sidebar/sidebar'
import { TimezoneProvider } from '@/features/dashboard/timezone/context'
import { parseTimezone } from '@/features/dashboard/timezone/utils'
import {
  getQueryClient,
  HydrateClient,
  prefetchAsync,
  trpc,
} from '@/trpc/server'
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
  const authContext = await getAuthContext()

  const sidebarState = cookieStore.get(COOKIE_KEYS.SIDEBAR_STATE)?.value
  const defaultOpen = sidebarState === 'true'
  const timezone = parseTimezone(
    cookieStore.get(COOKIE_KEYS.DASHBOARD_TIMEZONE)?.value
  )

  if (!authContext) {
    throw redirect(AUTH_URLS.SIGN_IN)
  }

  const teamsQueryOptions = trpc.teams.list.queryOptions(
    undefined,
    DASHBOARD_TEAMS_LIST_QUERY_OPTIONS
  )
  const userProfileQueryOptions = trpc.user.profile.queryOptions(
    undefined,
    DASHBOARD_USER_PROFILE_QUERY_OPTIONS
  )

  const queryClient = getQueryClient()
  const teams = await queryClient
    .fetchQuery(teamsQueryOptions)
    .catch(() => null)
  const team = teams?.find((candidate) => candidate.slug === teamSlug)
  const dashboardTeam = team
    ? {
        id: team.id,
        name: team.name,
        slug: teamSlug,
      }
    : undefined

  const featureFlagContext = {
    user: {
      id: authContext.user.id,
      email: authContext.user.email ?? undefined,
    },
    team: dashboardTeam,
  }
  const [evaluatedFeatureFlags] = await Promise.all([
    featureFlags.evaluateAll(featureFlagContext),
    prefetchAsync(userProfileQueryOptions),
  ])

  return (
    <HydrateClient>
      <FeatureFlagsProvider initialFlags={evaluatedFeatureFlags}>
        <DashboardTeamGate teamSlug={teamSlug} fallbackUser={authContext.user}>
          <TimezoneProvider initialTimezone={timezone}>
            <SidebarProvider
              defaultOpen={
                typeof sidebarState === 'undefined' ? true : defaultOpen
              }
            >
              <div className="fixed inset-0 flex max-h-full min-h-0 w-full flex-col overflow-hidden">
                <div className="flex h-full max-h-full min-h-0 w-full flex-1 overflow-hidden">
                  <Sidebar />
                  <SidebarInset>
                    <DashboardPostHogErrorBoundary>
                      <DashboardLayoutView params={params}>
                        {children}
                      </DashboardLayoutView>
                    </DashboardPostHogErrorBoundary>
                  </SidebarInset>
                </div>
              </div>
            </SidebarProvider>
          </TimezoneProvider>
        </DashboardTeamGate>
      </FeatureFlagsProvider>
    </HydrateClient>
  )
}
