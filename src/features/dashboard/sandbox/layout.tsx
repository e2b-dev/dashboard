'use client'

import { SANDBOX_INSPECT_MINIMUM_ENVD_VERSION } from '@/configs/versioning'
import { useRouteParams } from '@/lib/hooks/use-route-params'
import { isVersionCompatible } from '@/lib/utils/version'
import { DashboardTab, DashboardTabs } from '@/ui/dashboard-tabs'
import { ListIcon, StorageIcon } from '@/ui/primitives/icons'
import { notFound } from 'next/navigation'
import { useSandboxContext } from './context'
import SandboxInspectIncompatible from './inspect/incompatible'

interface SandboxLayoutProps {
  children: React.ReactNode
  header: React.ReactNode
  tabsHeaderAccessory?: React.ReactNode
}

export default function SandboxLayout({
  children,
  header,
  tabsHeaderAccessory,
}: SandboxLayoutProps) {
  const { teamIdOrSlug } =
    useRouteParams<'/dashboard/[teamIdOrSlug]/sandboxes/[sandboxId]'>()

  const { sandboxInfo, isSandboxInfoLoading, isSandboxNotFound } =
    useSandboxContext()

  const shouldShowInspectIncompatible = Boolean(
    sandboxInfo?.state !== 'killed' &&
      sandboxInfo?.envdVersion &&
      !isVersionCompatible(
        sandboxInfo.envdVersion,
        SANDBOX_INSPECT_MINIMUM_ENVD_VERSION
      )
  )

  if (isSandboxNotFound) {
    throw notFound()
  }

  if (!sandboxInfo) {
    if (!isSandboxInfoLoading) {
      throw notFound()
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col max-md:overflow-y-auto">
      {header}

      <DashboardTabs
        type="path"
        layoutKey="tabs-indicator-sandbox"
        className="max-md:sticky max-md:top-0 max-md:z-20 max-md:h-[calc(100svh-var(--protected-navbar-height))] max-md:max-h-[calc(100svh-var(--protected-navbar-height))] max-md:min-h-[calc(100svh-var(--protected-navbar-height))]"
        headerAccessory={tabsHeaderAccessory}
      >
        <DashboardTab
          id="logs"
          label="Logs"
          className="flex min-h-0 flex-1 flex-col"
          icon={<ListIcon className="size-4" />}
        >
          {children}
        </DashboardTab>
        <DashboardTab
          id="filesystem"
          label="Filesystem"
          className="flex min-h-0 flex-1 flex-col"
          icon={<StorageIcon className="size-4" />}
        >
          {!sandboxInfo || !shouldShowInspectIncompatible ? (
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
