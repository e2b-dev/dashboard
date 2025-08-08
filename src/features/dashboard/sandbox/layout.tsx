'use client'

import { SANDBOX_INSPECT_MINIMUM_ENVD_VERSION } from '@/configs/versioning'
import { isVersionCompatible } from '@/lib/utils/version'
import { SidebarTrigger } from '@/ui/primitives/sidebar'
import { ThemeSwitcher } from '@/ui/theme-switcher'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import { DashboardSurveyPopover } from '../navbar/dashboard-survey-popover'
import { useSandboxContext } from './context'
import SandboxDetailsTabs from './tabs'

interface SandboxLayoutProps {
  children: React.ReactNode
  header: React.ReactNode
  teamIdOrSlug: string
}

export default function SandboxLayout({
  teamIdOrSlug,
  children,
  header,
}: SandboxLayoutProps) {
  const { sandboxInfo } = useSandboxContext()

  const isEnvdVersionIncompatibleForInspect = Boolean(
    sandboxInfo?.envdVersion &&
      isVersionCompatible(
        sandboxInfo.envdVersion,
        SANDBOX_INSPECT_MINIMUM_ENVD_VERSION
      )
  )

  if (!sandboxInfo) {
    throw notFound()
  }

  return (
    <div className="flex max-h-svh min-h-0 flex-1 flex-col max-md:overflow-y-auto">
      <div className="bg-bg sticky top-0 z-50 flex h-[var(--protected-nav-height)] w-full border-b pr-3 md:pl-3">
        <div className="flex w-full items-center gap-2">
          <SidebarTrigger className="text-fg-secondary h-full w-11 rounded-none border-r px-3 md:hidden" />

          <h2 className="mr-auto">Sandbox</h2>

          <Suspense fallback={null}>
            <ThemeSwitcher />
          </Suspense>
          {process.env.NEXT_PUBLIC_POSTHOG_KEY && <DashboardSurveyPopover />}
        </div>
      </div>
      {header}
      <SandboxDetailsTabs
        tabs={['inspect']}
        isEnvdVersionIncompatibleForInspect={
          isEnvdVersionIncompatibleForInspect
        }
        templateNameOrId={sandboxInfo.alias || sandboxInfo.templateID}
        teamIdOrSlug={teamIdOrSlug}
      >
        {children}
      </SandboxDetailsTabs>
    </div>
  )
}
