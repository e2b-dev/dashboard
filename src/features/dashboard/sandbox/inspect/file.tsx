import { FileType } from 'e2b'
import { FilesystemNode } from './filesystem/types'
import { DataTableRow } from '@/ui/data-table'
import { FileIcon } from 'lucide-react'

interface SandboxInspectFileProps {
  file: FilesystemNode & {
    type: FileType.FILE
  }
}

export default function SandboxInspectFile({ file }: SandboxInspectFileProps) {
  return (
    <DataTableRow className="gap-1 px-2 py-1 transition-none">
      <FileIcon className="text-fg-500 size-3" />
      <span className="text-fg-300 font-sans text-sm">{file.name}</span>
    </DataTableRow>
  )
}
