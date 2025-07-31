import { cn } from '@/lib/utils'
import { DataTableRow } from '@/ui/data-table'
import { AlertCircle, FileIcon } from 'lucide-react'
import { FilesystemNode } from './filesystem/types'
import { useFile } from './hooks/use-file'
import NodeLabel from './node-label'

interface SandboxInspectFileProps {
  file: FilesystemNode & {
    type: 'file'
  }
}

export default function SandboxInspectFile({ file }: SandboxInspectFileProps) {
  const { isSelected, isLoading, hasError, error, toggle } = useFile(file.path)

  return (
    <DataTableRow
      role="button"
      tabIndex={0}
      className={cn(
        'hover:bg-bg-200 focus:ring-ring focus:bg-bg-200 h-7 min-h-7 cursor-pointer gap-1 px-1.5 transition-none group-[data-slot=inspect-dir]:px-2 even:bg-transparent focus:outline-none',
        {
          'bg-bg-200': isSelected,
        }
      )}
      onClick={toggle}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          toggle()
        }
      }}
    >
      <FileIcon
        className={cn('size-3', {
          'text-fg-500': !isSelected,
          'text-fg': isSelected,
        })}
      />
      <NodeLabel name={file.name} isActive={isSelected} isLoading={isLoading} />
      {hasError && (
        <span className="text-warning flex items-center gap-1 truncate pt-0.5 pl-1 align-baseline text-xs text-ellipsis">
          <AlertCircle className="size-3" />
          {error}
        </span>
      )}
    </DataTableRow>
  )
}
