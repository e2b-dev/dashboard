import { COOKIE_KEYS } from '@/configs/cookies'
import { METADATA } from '@/configs/metadata'
import { DashboardContextProvider } from '@/features/dashboard/context'
import DashboardLayoutView from '@/features/dashboard/layout/layout'
import Sidebar from '@/features/dashboard/sidebar/sidebar'
import { createClient } from '@/lib/clients/supabase/server'
import getUserMemo from '@/server/auth/get-user-memo'
import { SidebarInset, SidebarProvider } from '@/ui/primitives/sidebar'
import { cookies } from 'next/headers'
import { unauthorized } from 'next/navigation'

export const metadata = {
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
  const supabase = await createClient()
  const cookieStore = await cookies()
  const user = await getUserMemo(supabase)

  const sidebarState = cookieStore.get(COOKIE_KEYS.SIDEBAR_STATE)?.value
  const defaultOpen = sidebarState === 'true'

  if (!user.data.user) {
    throw unauthorized()
  }

  return (
    <DashboardContextProvider initialTeam={null} initialUser={user.data.user}>
      <SidebarProvider
        defaultOpen={typeof sidebarState === 'undefined' ? true : defaultOpen}
      >
        <div className="fixed inset-0 flex max-h-full min-h-0 w-full flex-col overflow-hidden">
          <div className="flex h-full max-h-full min-h-0 w-full flex-1 overflow-hidden">
            <Sidebar params={params} />
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

// const { teamIdOrSlug } = await params

// const cookieStore = await cookies()

// const sidebarState = cookieStore.get(COOKIE_KEYS.SIDEBAR_STATE)?.value
// const defaultOpen = sidebarState === 'true'

// const selectedTeam = res?.data.find((team) => team.id === teamId) ?? null

// return (
//   <DashboardContextProvider
//     initialTeam={res.data}
//     initialUser={session!.user}
//   >
//     <SidebarProvider
//       defaultOpen={typeof sidebarState === 'undefined' ? true : defaultOpen}
//     >
//       <div className="fixed inset-0 flex max-h-full min-h-0 w-full flex-col overflow-hidden">
//         <div className="flex h-full max-h-full min-h-0 w-full flex-1 overflow-hidden">
//           <Sidebar params={params} />
//           <SidebarInset>
//             <DashboardLayoutView>{children}</DashboardLayoutView>
//           </SidebarInset>
//         </div>
//       </div>
//     </SidebarProvider>
//     <Suspense fallback={null}>
//       <DashboardTitleProvider />
//     </Suspense>
//   </ServerContextProvider>
