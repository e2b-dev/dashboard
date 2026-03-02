'use client'

import LoadingLayout from '@/features/dashboard/loading-layout'
import SandboxInspectFilesystemHeader from '@/features/dashboard/sandbox/inspect/filesystem-header'
import { ScrollArea } from '@/ui/primitives/scroll-area'
import { useSandboxContext } from '../context'
import SandboxInspectFrame from './frame'
import { useDirectoryState } from './hooks/use-directory'
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
  const { isRunning } = useSandboxContext()
  const children = useRootChildren()
  const { isLoaded, isLoading } = useDirectoryState(rootPath)
  const showRootLoading =
    isRunning && children.length === 0 && (!isLoaded || isLoading)

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
          {showRootLoading ? (
            <LoadingLayout />
          ) : !children.length ? (
            <SandboxInspectNotFound />
          ) : (
            <ScrollArea className="h-full">
              <SandboxInspectParentDirItem rootPath={rootPath} />
              {children.map((child) => (
                <SandboxInspectNode key={child.path} path={child.path} />
              ))}
            </ScrollArea>
          )}
        </div>
      </SandboxInspectFrame>
    </div>
  )
}
