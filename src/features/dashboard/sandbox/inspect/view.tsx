'use client'

import SandboxInspectProvider from '@/features/dashboard/sandbox/inspect/context'
import SandboxInspectFilesystem from '@/features/dashboard/sandbox/inspect/filesystem'
import SandboxInspectViewer from '@/features/dashboard/sandbox/inspect/viewer'
import type { EntryInfo } from 'e2b'

interface SandboxInspectViewProps {
  rootPath: string
  seedEntries: EntryInfo[]
}

export default function SandboxInspectView({
  rootPath,
  seedEntries,
}: SandboxInspectViewProps) {
  return (
    <SandboxInspectProvider rootPath={rootPath} seedEntries={seedEntries}>
      <div className="flex min-h-0 flex-1 gap-4 overflow-hidden p-3 md:p-6">
        <SandboxInspectFilesystem rootPath={rootPath} />
        <SandboxInspectViewer />
      </div>
    </SandboxInspectProvider>
  )
}
