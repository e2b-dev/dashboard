'use client'

import { useRootChildren } from './hooks/use-node'
import SandboxInspectNode from './node'
import { ScrollArea } from '@/ui/primitives/scroll-area'

export default function SandboxInspectFilesystem() {
  const children = useRootChildren()

  return (
    <div className="h-full min-h-0 flex-1 p-4 pt-0 md:px-10 md:pb-10">
      <ScrollArea className="border-border/80 h-full rounded-sm border">
        {children.map((child) => (
          <SandboxInspectNode key={child.path} path={child.path} />
        ))}
      </ScrollArea>
    </div>
  )
}
