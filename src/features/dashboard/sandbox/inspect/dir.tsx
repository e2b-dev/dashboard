import { FilesystemNode } from './filesystem/types'
import { ChevronRight } from 'lucide-react'
import SandboxInspectNode from './node'
import { useDirectory } from './hooks/use-directory'
import { cn } from '@/lib/utils'
import { DataTableRow } from '@/ui/data-table'
import { motion } from 'motion/react'
import { FileType } from 'e2b'
import NodeLabel from './node-label'

interface SandboxInspectDirProps {
  dir: FilesystemNode & {
    type: FileType.DIR
  }
}

export default function SandboxInspectDir({ dir }: SandboxInspectDirProps) {
  const {
    hasError,
    error,
    isExpanded,
    toggle,
    isLoading,
    isLoaded,
    hasChildren,
    children,
  } = useDirectory(dir.path)

  return (
    <>
      <DataTableRow
        role="button"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            toggle()
          }
        }}
        className={cn(
          'group hover:bg-bg-200 focus:ring-ring focus:bg-bg-200 cursor-pointer gap-1 truncate py-0.5 transition-none select-none focus:outline-none'
        )}
        data-slot="inspect-dir"
      >
        <motion.span
          initial={{
            rotate: isExpanded && isLoaded ? 90 : 0,
          }}
          animate={{
            rotate: isExpanded && isLoaded ? 90 : 0,
            color:
              isExpanded && isLoaded
                ? 'var(--color-fg)'
                : 'var(--color-fg-500)',
          }}
        >
          <ChevronRight className="ml-1 size-4" />
        </motion.span>
        <NodeLabel
          name={dir.name}
          isActive={isExpanded}
          isLoading={isLoading}
        />
        {hasError && (
          <span className="text-error truncate pl-1 text-sm text-ellipsis">
            {error}
          </span>
        )}
      </DataTableRow>

      {isExpanded && hasChildren && (
        <div className="flex flex-col pl-2">
          {children.map((child) => (
            <SandboxInspectNode key={child.path} path={child.path} />
          ))}
        </div>
      )}
    </>
  )
}
