import { FileType } from 'e2b'
import { FilesystemNode } from './filesystem/types'
import { DataTableRow } from '@/ui/data-table'
import { FileIcon } from 'lucide-react'
import { useNodeSelection } from './hooks/use-node'
import { cn } from '@/lib/utils'

interface SandboxInspectFileProps {
  file: FilesystemNode & {
    type: FileType.FILE
  }
}

export default function SandboxInspectFile({ file }: SandboxInspectFileProps) {
  const { isSelected, select } = useNodeSelection(file.path)

  return (
    <DataTableRow
      role="button"
      tabIndex={0}
      className={cn(
        'hover:bg-bg-200 focus:ring-ring focus:bg-bg-200 cursor-pointer gap-1 px-1.5 py-1 transition-none group-[data-slot=inspect-dir]:px-2',
        {
          'bg-bg-200': isSelected,
        }
      )}
      onClick={select}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          select()
        }
      }}
    >
      <FileIcon className="text-fg-500 size-3" />
      <span className="text-fg-300 font-sans text-sm">{file.name}</span>
    </DataTableRow>
  )
}
