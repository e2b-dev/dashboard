'use client'

import { ScrollArea, ScrollBar } from '@/ui/primitives/scroll-area'
import { useRootChildren } from './hooks/use-node'
import SandboxInspectNode from './node'

export default function SandboxInspectFilesystem() {
  const children = useRootChildren()

  return (
    <div className="flex flex-col gap-1">
      <ScrollArea className="px-8">
        {children.map((child) => (
          <SandboxInspectNode key={child.path} path={child.path} />
        ))}
        <ScrollBar orientation="vertical" />
      </ScrollArea>
    </div>
  )
}
