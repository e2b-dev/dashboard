import { FilesystemNode } from './filesystem/types'
import { AlertCircle, ChevronRight, CircleSlash } from 'lucide-react'
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
          'group hover:bg-bg-200 focus:ring-ring focus:bg-bg-200 h-7 cursor-pointer gap-1 truncate transition-none select-none focus:outline-none'
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
          <span className="text-error flex items-center gap-1 truncate pl-1 text-xs text-ellipsis">
            <AlertCircle className="size-3" />
            {error}
          </span>
        )}
        {!hasChildren && !isLoading && isLoaded && (
          <span className="text-fg-500 flex translate-y-0.25 items-center gap-1 pl-1 text-xs">
            <CircleSlash className="size-3" />
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
