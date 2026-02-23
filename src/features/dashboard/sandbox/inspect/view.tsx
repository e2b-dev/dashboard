'use client'

import SandboxInspectProvider from '@/features/dashboard/sandbox/inspect/context'
import SandboxInspectFilesystem from '@/features/dashboard/sandbox/inspect/filesystem'
import SandboxInspectViewer from '@/features/dashboard/sandbox/inspect/viewer'
import { cn } from '@/lib/utils'
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
      <div
        className={cn(
          'flex flex-1 gap-1 overflow-hidden p-3 md:p-6',
          'max-md:sticky max-md:top-0 max-md:min-h-[calc(100vh-var(--protected-navbar-height))]'
        )}
      >
        <SandboxInspectFilesystem rootPath={rootPath} />
        <SandboxInspectViewer />
      </div>
    </SandboxInspectProvider>
  )
}
