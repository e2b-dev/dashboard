import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next/types'
import { COOKIE_KEYS } from '@/configs/cookies'
import { METADATA } from '@/configs/metadata'
import { getApiKey } from '@/core/server/auth'
import DashboardLayoutView from '@/features/dashboard/layouts/layout'
import Sidebar from '@/features/dashboard/sidebar/sidebar'
import { TimezoneProvider } from '@/features/dashboard/timezone/context'
import { parseTimezone } from '@/features/dashboard/timezone/utils'
import { CatchErrorBoundary } from '@/ui/error'
import { SidebarInset, SidebarProvider } from '@/ui/primitives/sidebar'

export const metadata: Metadata = {
  title: 'Dashboard - E2B',
  description: METADATA.description,
  openGraph: METADATA.openGraph,
  twitter: METADATA.twitter,
  robots: 'noindex, nofollow',
}

export interface DashboardLayoutProps {
  children: React.ReactNode
}

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const cookieStore = await cookies()

  const apiKey = await getApiKey()
  if (!apiKey) {
    redirect('/')
  }

  const sidebarState = cookieStore.get(COOKIE_KEYS.SIDEBAR_STATE)?.value
  const defaultOpen = sidebarState === 'true'
  const timezone = parseTimezone(
    cookieStore.get(COOKIE_KEYS.DASHBOARD_TIMEZONE)?.value
  )

  return (
    <TimezoneProvider initialTimezone={timezone}>
      <SidebarProvider
        defaultOpen={typeof sidebarState === 'undefined' ? true : defaultOpen}
      >
        <div className="fixed inset-0 flex max-h-full min-h-0 w-full flex-col overflow-hidden">
          <div className="relative flex h-full max-h-full min-h-0 w-full flex-1 overflow-hidden">
            <Sidebar anchor="container" />
            <SidebarInset>
              <CatchErrorBoundary>
                <DashboardLayoutView>{children}</DashboardLayoutView>
              </CatchErrorBoundary>
            </SidebarInset>
          </div>
        </div>
      </SidebarProvider>
    </TimezoneProvider>
  )
}
