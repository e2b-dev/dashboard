import { FileType } from 'e2b'
import { FilesystemNode } from './filesystem/types'
import { Button } from '@/ui/primitives/button'
import { FolderOpenIcon } from 'lucide-react'
import SandboxInspectNode from './node'
import { useDirectory } from './hooks/use-directory'

interface SandboxInspectDirProps {
  dir: FilesystemNode & {
    type: FileType.DIR
  }
}

export default function SandboxInspectDir({ dir }: SandboxInspectDirProps) {
  const { isExpanded, toggle, isLoading, hasChildren, children } = useDirectory(
    dir.path
  )

  return (
    <div className="flex flex-col gap-2">
      <Button
        variant="outline"
        size="sm"
        className="w-fit"
        onClick={() => toggle()}
        loading={isLoading}
      >
        <FolderOpenIcon className="h-4 w-4" />
        <span className="text-sm text-gray-500">{dir.name}</span>
      </Button>
      {isExpanded && (
        <div className="flex flex-col gap-2 pl-6">
          {children.map((child) => (
            <SandboxInspectNode key={child.path} path={child.path} />
          ))}
        </div>
      )}
    </div>
  )
}
