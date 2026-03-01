'use client'

import SandboxInspectProvider from '@/features/dashboard/sandbox/inspect/context'
import SandboxInspectFilesystem from '@/features/dashboard/sandbox/inspect/filesystem'
import SandboxInspectViewer from '@/features/dashboard/sandbox/inspect/viewer'

interface SandboxInspectViewProps {
  rootPath: string
}

export default function SandboxInspectView({
  rootPath,
}: SandboxInspectViewProps) {
  return (
    <SandboxInspectProvider rootPath={rootPath}>
      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden p-3 md:p-6">
        <SandboxInspectFilesystem rootPath={rootPath} />
        <SandboxInspectViewer />
      </div>
    </SandboxInspectProvider>
  )
}
