import SandboxInspectDir from './dir'
import SandboxInspectFile from './file'
import { useFilesystemNode } from './hooks/use-node'

interface SandboxInspectDirProps {
  path: string
}

export default function SandboxInspectNode({ path }: SandboxInspectDirProps) {
  const node = useFilesystemNode(path)!

  switch (node.type) {
    case 'dir':
      return <SandboxInspectDir dir={node} />
    case 'file':
      return <SandboxInspectFile file={node} />
  }
}
