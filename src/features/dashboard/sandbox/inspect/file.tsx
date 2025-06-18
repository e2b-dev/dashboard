import { FileType } from 'e2b'
import { FilesystemNode } from './filesystem/types'
import { FileIcon } from 'lucide-react'

interface SandboxInspectFileProps {
  file: FilesystemNode & {
    type: FileType.FILE
  }
}

export default function SandboxInspectFile({ file }: SandboxInspectFileProps) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <FileIcon className="h-4 w-4" />
        <span className="text-sm text-gray-500">{file.name}</span>
      </div>
    </div>
  )
}
