'use client'

import SandboxInspectFrame from './frame'
import { useRootChildren } from './hooks/use-node'
import SandboxInspectNode from './node'
import { ScrollArea } from '@/ui/primitives/scroll-area'
import SandboxInspectFilesystemHeader from '@/features/dashboard/sandbox/inspect/filesystem-header'

interface SandboxInspectFilesystemProps {
  rootPath: string
}

export default function SandboxInspectFilesystem({
  rootPath,
}: SandboxInspectFilesystemProps) {
  const children = useRootChildren()

  return (
    <SandboxInspectFrame
      initial={{
        flex: 1,
      }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      header={<SandboxInspectFilesystemHeader rootPath={rootPath} />}
    >
      <div className="h-full flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          {children.map((child) => (
            <SandboxInspectNode key={child.path} path={child.path} />
          ))}
        </ScrollArea>
      </div>
    </SandboxInspectFrame>
  )
}
