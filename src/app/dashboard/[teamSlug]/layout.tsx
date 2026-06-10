import { cookies } from 'next/headers'
import type { Metadata } from 'next/types'
import { DashboardTeamGate } from '@/app/dashboard/[teamSlug]/team-gate'
import { COOKIE_KEYS } from '@/configs/cookies'
import { METADATA } from '@/configs/metadata'
import DashboardLayoutView from '@/features/dashboard/layouts/layout'
import Sidebar from '@/features/dashboard/sidebar/sidebar'
import { HydrateClient } from '@/trpc/server'
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

  const sidebarState = cookieStore.get(COOKIE_KEYS.SIDEBAR_STATE)?.value
  const defaultOpen = sidebarState === 'true'

  return (
    <HydrateClient>
      <DashboardTeamGate teamSlug={teamSlug}>
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
