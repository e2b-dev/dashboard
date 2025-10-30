'use client'

import { SANDBOX_INSPECT_MINIMUM_ENVD_VERSION } from '@/configs/versioning'
import { isVersionCompatible } from '@/lib/utils/version'
import { DashboardTab, DashboardTabs } from '@/ui/dashboard-tabs'
import { notFound } from 'next/navigation'
import { useSandboxContext } from './context'
import SandboxInspectIncompatible from './inspect/incompatible'

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

  const isEnvdVersionCompatibleForInspect = Boolean(
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
    <div className="flex max-h-svh h-full min-h-0 flex-1 flex-col max-md:h-auto max-md:min-h-svh max-md:overflow-y-auto">
      {header}

      <DashboardTabs
        type="path"
        layoutKey="tabs-indicator-sandbox"
        className="max-md:sticky max-md:top-0 max-md:z-20 max-md:bg-bg max-md:min-h-svh"
      >
        <DashboardTab
          id="inspect"
          label="Inspect"
          className="flex flex-col max-h-full relative"
        >
          {isEnvdVersionCompatibleForInspect ? (
            children
          ) : (
            <SandboxInspectIncompatible
              templateNameOrId={sandboxInfo.alias || sandboxInfo.templateID}
              teamIdOrSlug={teamIdOrSlug}
            />
          )}
        </DashboardTab>
      </DashboardTabs>
    </div>
  )
}
