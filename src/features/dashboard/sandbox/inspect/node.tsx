import { FileType } from 'e2b'
import SandboxInspectDir from './dir'
import { useFilesystemNode } from './hooks/use-node'
import SandboxInspectFile from './file'

interface SandboxInspectDirProps {
  path: string
}

export default function SandboxInspectNode({ path }: SandboxInspectDirProps) {
  const node = useFilesystemNode(path)!

  switch (node.type) {
    case FileType.DIR:
      return <SandboxInspectDir dir={node} />
    case FileType.FILE:
      return <SandboxInspectFile file={node} />
  }
}
