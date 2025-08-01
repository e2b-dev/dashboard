'use client'

import SandboxInspectFilesystemHeader from '@/features/dashboard/sandbox/inspect/filesystem-header'
import { ScrollArea } from '@/ui/primitives/scroll-area'
import SandboxInspectFrame from './frame'
import { useRootChildren } from './hooks/use-node'
import SandboxInspectNode from './node'
import SandboxInspectNotFound from './not-found'
import SandboxInspectParentDirItem from './parent-dir-item'
import { StoppedBanner } from './stopped-banner'

interface SandboxInspectFilesystemProps {
  rootPath: string
}

export default function SandboxInspectFilesystem({
  rootPath,
}: SandboxInspectFilesystemProps) {
  const children = useRootChildren()

  return (
    <div className="h-full flex-1 flex flex-col gap-4 overflow-hidden">
      <StoppedBanner rootNodeCount={children.length} />
      <SandboxInspectFrame
        initial={{
          flex: 1,
        }}
        transition={{ duration: 0.25, ease: 'easeInOut' }}
        header={<SandboxInspectFilesystemHeader rootPath={rootPath} />}
      >
        <div className="h-full flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            {children.length > 0 ? (
              <>
                <SandboxInspectParentDirItem rootPath={rootPath} />
                {children.map((child) => (
                  <SandboxInspectNode key={child.path} path={child.path} />
                ))}
              </>
            ) : (
              <SandboxInspectNotFound />
            )}
          </ScrollArea>
        </div>
      </SandboxInspectFrame>
    </div>
  )
}
