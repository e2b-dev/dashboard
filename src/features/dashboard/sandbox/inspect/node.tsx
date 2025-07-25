import SandboxInspectDir from './dir'
import { useFilesystemNode } from './hooks/use-node'
import SandboxInspectFile from './file'

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
