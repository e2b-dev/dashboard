import { FilesystemNode } from './filesystem/types'
import type { CSSProperties } from 'react'
import { ChevronRight } from 'lucide-react'
import SandboxInspectNode from './node'
import { useDirectory } from './hooks/use-directory'
import { cn } from '@/lib/utils'
import { DataTableRow } from '@/ui/data-table'
import { motion } from 'motion/react'
import { FileType } from 'e2b'

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
        className={cn(
          'hover:bg-bg-200 cursor-pointer gap-1 truncate py-1 transition-none select-none'
        )}
      >
        <motion.span
          animate={{
            rotate: isExpanded && isLoaded ? 90 : 0,
            color:
              isExpanded && isLoaded
                ? 'var(--color-fg)'
                : 'var(--color-fg-500)',
          }}
        >
          <ChevronRight className="size-4" />
        </motion.span>
        <span
          style={{ '--shiny-width': '100px' } as CSSProperties}
          className={cn('truncate text-left font-sans transition-colors', {
            // Shine effect
            'text-fg-500 animate-shiny-text [background-size:var(--shiny-width)_100%] bg-clip-text [background-position:0_0] bg-no-repeat duration-1000 [transition:background-position_1s_ease-in-out]':
              isLoading,
            // Shine gradient
            'bg-gradient-to-r from-transparent via-[var(--color-fg)] via-50% to-transparent':
              isLoading,
          })}
        >
          {dir.name}
        </span>
        {hasError && (
          <span className="text-error truncate text-sm text-ellipsis">
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
