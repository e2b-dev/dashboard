'use client'

import { SANDBOX_INSPECT_MINIMUM_ENVD_VERSION } from '@/configs/versioning'
import type { SandboxManagementAuth } from '@/core/shared/sandbox-management-auth'
import SandboxInspectProvider from '@/features/dashboard/sandbox/inspect/context'
import SandboxInspectFilesystem from '@/features/dashboard/sandbox/inspect/filesystem'
import SandboxInspectViewer from '@/features/dashboard/sandbox/inspect/viewer'
import { useRouteParams } from '@/lib/hooks/use-route-params'
import { isVersionCompatible } from '@/lib/utils/version'
import { useSandboxContext } from '../context'
import SandboxInspectIncompatible from './incompatible'

interface SandboxInspectViewProps {
  rootPath: string
  sandboxManagementAuth: SandboxManagementAuth
}

export default function SandboxInspectView({
  rootPath,
  sandboxManagementAuth,
}: SandboxInspectViewProps) {
  const { teamSlug } =
    useRouteParams<'/dashboard/[teamSlug]/sandboxes/[sandboxId]'>()
  const { sandboxInfo } = useSandboxContext()

  const shouldShowInspectIncompatible = Boolean(
    sandboxInfo?.state !== 'killed' &&
      sandboxInfo?.envdVersion &&
      !isVersionCompatible(
        sandboxInfo.envdVersion,
        SANDBOX_INSPECT_MINIMUM_ENVD_VERSION
      )
  )

  if (sandboxInfo && shouldShowInspectIncompatible) {
    return (
      <SandboxInspectIncompatible
        templateNameOrId={sandboxInfo.alias || sandboxInfo.templateID}
        teamSlug={teamSlug}
      />
    )
  }

  return (
    <SandboxInspectProvider
      key={`${sandboxInfo?.sandboxID ?? 'unknown'}:${rootPath}`}
      rootPath={rootPath}
      sandboxManagementAuth={sandboxManagementAuth}
    >
      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden p-3 md:p-6">
        <SandboxInspectFilesystem rootPath={rootPath} />
        <SandboxInspectViewer />
      </div>
    </SandboxInspectProvider>
  )
}
