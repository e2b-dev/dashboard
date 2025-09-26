'use client'

import { SANDBOX_INSPECT_MINIMUM_ENVD_VERSION } from '@/configs/versioning'
import { isVersionCompatible } from '@/lib/utils/version'
import { notFound } from 'next/navigation'
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
    <div className="flex max-h-svh min-h-0 flex-1 flex-col max-md:overflow-y-auto h-full">
      {header}
      <SandboxDetailsTabs
        tabs={['inspect']}
        isEnvdVersionIncompatibleForInspect={
          isEnvdVersionIncompatibleForInspect
        }
        templateNameOrId={sandboxInfo.alias || sandboxInfo.templateID}
        teamIdOrSlug={teamIdOrSlug}
        sandboxId={sandboxInfo.sandboxID}
      >
        {children}
      </SandboxDetailsTabs>
    </div>
  )
}
