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
    <div className="flex max-h-svh min-h-0 flex-1 flex-col max-md:overflow-y-auto h-full">
      {header}

      <DashboardTabs type="path" layoutKey="tabs-indicator-sandbox">
        <DashboardTab id="inspect" label="Inspect">
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
