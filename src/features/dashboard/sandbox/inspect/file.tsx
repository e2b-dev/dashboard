import { FileType } from 'e2b'
import { FilesystemNode } from './filesystem/types'
import { DataTableRow } from '@/ui/data-table'

interface SandboxInspectFileProps {
  file: FilesystemNode & {
    type: FileType.FILE
  }
}

export default function SandboxInspectFile({ file }: SandboxInspectFileProps) {
  return (
    <DataTableRow className="hover:bg-bg-200 gap-1 px-2 py-1 transition-none">
      <span className="text-fg-300 font-sans text-sm">{file.name}</span>
    </DataTableRow>
  )
}
