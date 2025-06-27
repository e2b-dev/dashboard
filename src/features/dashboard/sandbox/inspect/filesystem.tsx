'use client'

import { useRootChildren } from './hooks/use-node'
import SandboxInspectNode from './node'
import { ScrollArea } from '@/ui/primitives/scroll-area'

export default function SandboxInspectFilesystem() {
  const children = useRootChildren()

  return (
    <div className="h-full flex-1 overflow-hidden">
      <ScrollArea className="h-full">
        {children.map((child) => (
          <SandboxInspectNode key={child.path} path={child.path} />
        ))}
      </ScrollArea>
    </div>
  )
}
