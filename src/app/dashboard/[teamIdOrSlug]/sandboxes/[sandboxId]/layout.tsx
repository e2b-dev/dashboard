import { DashboardSurveyPopover } from '@/features/dashboard/navbar/dashboard-survey-popover'
import { SandboxProvider } from '@/features/dashboard/sandbox/context'
import SandboxDetailsHeader from '@/features/dashboard/sandbox/header/header'
import SandboxDetailsTabs from '@/features/dashboard/sandbox/tabs'
import { resolveTeamIdInServerComponent } from '@/lib/utils/server'
import { getSandboxDetails } from '@/server/sandboxes/get-sandbox-details'
import { SidebarTrigger } from '@/ui/primitives/sidebar'
import { ThemeSwitcher } from '@/ui/theme-switcher'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

export const fetchCache = 'default-cache'

interface SandboxLayoutProps {
  children: React.ReactNode
  params: Promise<{ teamIdOrSlug: string; sandboxId: string }>
}

export default async function SandboxLayout({
  children,
  params,
}: SandboxLayoutProps) {
  const { teamIdOrSlug, sandboxId } = await params

  const teamId = await resolveTeamIdInServerComponent(teamIdOrSlug)
  const res = await getSandboxDetails({ teamId, sandboxId })

  if (!res?.data || res?.serverError) {
    throw notFound()
  }

  return (
    <SandboxProvider sandboxInfo={res?.data}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-y-auto">
        <div className="bg-bg sticky top-0 z-10 flex h-[var(--protected-nav-height)] w-full border-b pr-3 md:pl-3">
          <div className="flex w-full items-center gap-2">
            <SidebarTrigger className="text-fg-300 h-full w-11 rounded-none border-r px-3 md:hidden" />

            <h2 className="mr-auto text-lg font-bold">Sandbox</h2>

            <Suspense fallback={null}>
              <ThemeSwitcher />
            </Suspense>
            <DashboardSurveyPopover />
          </div>
        </div>
        <SandboxDetailsHeader
          teamIdOrSlug={teamIdOrSlug}
          sandboxInfo={res?.data}
        />
        <SandboxDetailsTabs tabs={['inspect']}>{children}</SandboxDetailsTabs>
      </div>
    </SandboxProvider>
  )
}
