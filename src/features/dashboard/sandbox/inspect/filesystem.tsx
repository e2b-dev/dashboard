'use client'

import { useRootChildren } from './hooks/use-node'
import SandboxInspectNode from './node'

export default function SandboxInspectFilesystem() {
  const children = useRootChildren()

  return (
    <div>
      {children.map((child) => (
        <SandboxInspectNode key={child.path} path={child.path} />
      ))}
    </div>
  )
}
